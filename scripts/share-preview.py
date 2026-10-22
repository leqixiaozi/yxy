"""Export only linked public pages for designs 02/04; serve the frozen allowlist."""
import argparse
import hashlib
import html
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
from pathlib import Path
import re
import shutil
import tempfile
import zipfile
from urllib.parse import parse_qs, quote, unquote, urlencode, urljoin, urlsplit
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / '.local' / 'share-preview'
ORIGIN = 'http://127.0.0.1:8099'
DESIGNS = ('constellation', 'nexus')


class References(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.urls = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name in ('href', 'src') and value:
                self.urls.append(value)


def export(include_samples=False):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = {}
    queue = ['/?design=' + design for design in DESIGNS]
    seen = set()
    while queue:
        target = queue.pop(0)
        parts = urlsplit(target)
        path = unquote(parts.path)
        design = parse_qs(parts.query).get('design', [''])[0]
        is_page = not Path(path).suffix
        if is_page:
            if design not in DESIGNS:
                continue
            key = path.rstrip('/') + '?design=' + design
        else:
            key = path
        if key in seen:
            continue
        seen.add(key)
        request_query = parts.query
        if is_page and not include_samples:
            request_query += ('&' if request_query else '') + 'demo_preview=off'
        with urlopen(ORIGIN + quote(path, safe='/') + ('?' + request_query if request_query else ''), timeout=30) as response:
            data = response.read()
            content_type = response.headers.get('Content-Type', mimetypes.guess_type(path)[0] or 'application/octet-stream')
        references = []
        if 'text/html' in content_type:
            source = data.decode('utf-8')
            # The shared snapshot offers only the requested two designs.
            source = re.sub(r'<a\b[^>]*href="[^"<>]*[?&]design=(?:flow|studio)"[^>]*>.*?</a>', '', source, flags=re.S)
            references = References(source).urls
            data = source.encode('utf-8')
        elif 'text/css' in content_type:
            references = re.findall(r'url\(\s*[\'"]?([^\s)\'\"]+)', data.decode('utf-8'))
        for ref in references:
            if ref.startswith(('#', 'data:', 'tel:', 'mailto:')):
                continue
            resolved = urlsplit(urljoin(ORIGIN + target, html.unescape(ref)))
            if resolved.netloc != urlsplit(ORIGIN).netloc:
                continue
            ref_path = unquote(resolved.path)
            suffix = Path(ref_path).suffix.lower()
            if suffix in ('.css', '.js', '.svg', '.webp', '.png', '.jpg', '.jpeg', '.woff2', '.pdf', '.ico'):
                queue.append(resolved.path + ('?' + resolved.query if resolved.query else ''))
            elif not suffix and (ref_path == '/' or ref_path.startswith(('/qualifications', '/news', '/cases', '/products'))):
                ref_design = parse_qs(resolved.query).get('design', [design])[0]
                if ref_design in DESIGNS:
                    queue.append(resolved.path + '?' + urlencode({'design': ref_design}))
        filename = hashlib.sha256(key.encode()).hexdigest()
        (OUTPUT / filename).write_bytes(data)
        manifest[key] = {'file': filename, 'type': content_type, 'bytes': len(data)}
    (OUTPUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    result = {'pages': sum('?design=' in key for key in manifest), 'resources': sum('?design=' not in key for key in manifest), 'bytes': sum(item['bytes'] for item in manifest.values()), 'include_samples': include_samples}
    (OUTPUT / 'export-info.json').write_text(json.dumps(result), encoding='utf-8')
    print(json.dumps(result))


def serve(port):
    manifest = json.loads((OUTPUT / 'manifest.json').read_text(encoding='utf-8'))

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.respond(False)

        def do_HEAD(self):
            self.respond(True)

        def do_POST(self):
            self.send_error(405)

        def respond(self, head):
            parts = urlsplit(self.path)
            path = unquote(parts.path)
            if path in ('/02', '/02/', '/04', '/04/'):
                self.send_response(302)
                self.send_header('Location', '/?design=' + ('nexus' if path.startswith('/04') else 'constellation'))
                self.end_headers()
                return
            if Path(path).suffix:
                key = path
            else:
                query = parse_qs(parts.query)
                if set(query) - {'design'}:
                    self.send_error(404)
                    return
                design = query.get('design', ['constellation'])[0]
                key = path.rstrip('/') + '?design=' + design
            item = manifest.get(key)
            if not item:
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header('Content-Type', item['type'])
            self.send_header('Content-Length', str(item['bytes']))
            self.send_header('Cache-Control', 'public, max-age=300')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('X-Robots-Tag', 'noindex, nofollow')
            self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
            self.end_headers()
            if not head:
                self.wfile.write((OUTPUT / item['file']).read_bytes())

    print(f'Snapshot preview listening on 127.0.0.1:{port}', flush=True)
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()


def package_pages():
    """Materialize the public allowlist with separate, query-free design routes."""
    manifest = json.loads((OUTPUT / 'manifest.json').read_text(encoding='utf-8'))
    destination = Path(tempfile.mkdtemp(prefix='pages-build-', dir=ROOT / '.local'))
    prefixes = {'constellation': '/02', 'nexus': '/04'}

    def rewrite_link(match):
        ref = html.unescape(match.group(1))
        if ref.startswith(('#', 'tel:', 'mailto:', 'data:')):
            return match.group(0)
        parts = urlsplit(urljoin(ORIGIN + '/', ref))
        if parts.netloc != urlsplit(ORIGIN).netloc:
            return match.group(0)
        design = parse_qs(parts.query).get('design', [''])[0]
        if design not in prefixes or Path(parts.path).suffix:
            return match.group(0)
        route = prefixes[design] + parts.path.rstrip('/') + '/'
        if parts.fragment:
            route += '#' + parts.fragment
        return 'href="' + html.escape(route, quote=True) + '"'

    for key, item in manifest.items():
        source = OUTPUT / item['file']
        if '?design=' in key:
            parts = urlsplit(key)
            design = parse_qs(parts.query)['design'][0]
            target = destination / prefixes[design].strip('/') / parts.path.strip('/') / 'index.html'
            content = re.sub(r'href="([^"]*)"', rewrite_link, source.read_text(encoding='utf-8'))
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding='utf-8')
        else:
            target = destination / key.lstrip('/')
            if not target.resolve().is_relative_to(destination.resolve()):
                raise ValueError('Asset path escaped export directory')
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
    (destination / 'index.html').write_text('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/02/"><title>屹鑫元方案预览</title><a href="/02/">方案02 数字星图</a> <a href="/04/">方案04 数字脉冲</a></html>', encoding='utf-8')
    (destination / '404.html').write_text('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>页面不存在</title><h1>404</h1><a href="/02/">方案02</a> <a href="/04/">方案04</a></html>', encoding='utf-8')
    (destination / '_headers').write_text('/*\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n', encoding='utf-8')
    archive = destination.with_suffix('.zip')
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as package:
        for file in destination.rglob('*'):
            if file.is_file():
                package.write(file, file.relative_to(destination).as_posix())
    export_info = OUTPUT / 'export-info.json'
    include_samples = json.loads(export_info.read_text(encoding='utf-8')).get('include_samples', False) if export_info.exists() else False
    result = {'directory': str(destination), 'archive': str(archive), 'routes': ['/02/', '/04/'], 'files': sum(file.is_file() for file in destination.rglob('*')), 'include_samples': include_samples}
    (ROOT / '.local' / 'pages-package.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('export', 'serve', 'package-pages'))
    parser.add_argument('--port', type=int, default=8100)
    parser.add_argument('--include-samples', action='store_true', help='Include currently visible preview samples; opt in only for an approved public preview')
    arguments = parser.parse_args()
    if arguments.include_samples and arguments.action != 'export':
        parser.error('--include-samples applies only to export')
    if arguments.action == 'export':
        export(include_samples=arguments.include_samples)
    elif arguments.action == 'package-pages':
        package_pages()
    else:
        serve(arguments.port)
