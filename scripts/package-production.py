"""Package the existing Grav runtime and published assets, excluding local state.

Creates one deployment archive without copying the full site to a staging tree.
The production administrator is separate from the local evaluation account.
Initial deployment only: never extract over a live site with edited content.
"""
from pathlib import Path
import hashlib
import io
import json
import re
import secrets
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.local' / 'deployment'
OUT.mkdir(parents=True, exist_ok=True)
credentials = OUT / 'admin-credentials.json'
if not credentials.exists():
    credentials.write_text(json.dumps({
        'url': 'https://www.yxykjai.com/admin',
        'username': 'yxyadmin',
        'password': 'Yxy!' + secrets.token_urlsafe(24) + '9a',
    }, ensure_ascii=False, indent=2), encoding='utf-8')
account = json.loads(credentials.read_text(encoding='utf-8'))
php = r'D:\devtool\scoop\apps\php84\current\php.exe'
password_hash = subprocess.run(
    [php, '-r', 'echo password_hash(stream_get_contents(STDIN), PASSWORD_DEFAULT);'],
    input=account['password'], text=True, capture_output=True, check=True,
).stdout

def put_text(archive, name, text, mode=0o644):
    data = text.encode('utf-8')
    info = tarfile.TarInfo(name)
    info.size = len(data)
    info.mode = mode
    archive.addfile(info, io.BytesIO(data))

archive_path = OUT / 'yxy-site.tar.gz'
count = 0
with tarfile.open(archive_path, 'w:gz') as archive:
    for base in ['bin', 'system', 'vendor', 'user/plugins', 'user/pages', 'user/themes/yxy']:
        for path in sorted((ROOT / 'site' / base).rglob('*')):
            if not path.is_file():
                continue
            rel = path.relative_to(ROOT / 'site')
            if any(part in {'.git', '.DS_Store', '__pycache__', 'node_modules'} for part in rel.parts):
                continue
            if any(part.startswith(('qa-module-', 'grav-security-probe')) for part in rel.parts):
                continue
            archive.add(path, arcname='site/' + rel.as_posix(), recursive=False)
            count += 1
    for name in ['index.php', 'composer.json', 'composer.lock', 'LICENSE.txt', 'robots.txt']:
        archive.add(ROOT / 'site' / name, arcname='site/' + name)
        count += 1
    for name in ['system.yaml', 'site.yaml', 'admin-next.yaml', 'media.yaml', 'themes/yxy.yaml']:
        text = (ROOT / 'site/user/config' / name).read_text(encoding='utf-8')
        if name == 'system.yaml':
            text = re.sub(r'^custom_base_url:.*$', "custom_base_url: 'https://www.yxykjai.com'", text, flags=re.M)
            text = text.replace('  display: true', '  display: false')
            text += '\nreverse_proxy_setup: true\nhttp_x_forwarded:\n  protocol: true\n'
        if name == 'admin-next.yaml':
            text = text.replace('本地试用环境', '官网内容管理')
        if name == 'themes/yxy.yaml':
            text = re.sub(r'^default_design:.*$', 'default_design: constellation', text, flags=re.M)
            text = re.sub(r'^preview_switcher:.*$', 'preview_switcher: false', text, flags=re.M)
        put_text(archive, 'site/user/config/' + name, text)
    put_text(archive, 'site/user/accounts/yxyadmin.yaml',
             'fullname: 屹鑫元网站管理员\nstate: enabled\nlanguage: zh-Hans\n'
             'access:\n  site:\n    login: true\n  admin:\n    login: true\n    super: true\n'
             '  api:\n    access: true\n    super: true\n'
             + "hashed_password: '" + password_hash + "'\n", 0o600)
    for name in ['compose.yaml', 'nginx.conf', 'php.ini', 'fpm.conf']:
        put_text(archive, name, (ROOT / 'deploy' / name).read_text(encoding='utf-8'))

digest = hashlib.sha256(archive_path.read_bytes()).hexdigest()
report = {'archive': str(archive_path), 'bytes': archive_path.stat().st_size,
          'sha256': digest, 'source_files': count,
          'excluded': ['local accounts and credentials', 'cache', 'logs', 'backup', 'tmp',
                       'user/data', 'private API and security config', 'QA probes']}
(OUT / 'package.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=False, indent=2))
