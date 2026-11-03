// User-approved: expose only the new website. Preserve the existing management
// services and upstreams, but restrict both pre-existing proxy hosts to LAN use.
const Access = require('/app/lib/access');
const hosts = require('/app/internal/proxy-host');
const model = require('/app/models/proxy_host');
(async () => {
  const access = new Access();
  await access.load(true);
  const rule = '\n# yxy deployment: management entry is internal only\n' +
    'if ($realip_remote_addr !~ "^(127\\.0\\.0\\.1|10\\.[0-9.]+|172\\.(1[6-9]|2[0-9]|3[01])\\.[0-9.]+|192\\.168\\.[0-9.]+|::1)$") { return 403; }\n';
  for (const [id, domain] of [[1, 'local.registry.wezhan.cn'], [2, '47.119.188.86']]) {
    const row = await model.query().findById(id);
    if (!row || row.is_deleted || !row.domain_names.includes(domain)) {
      throw new Error('Unexpected existing proxy host ' + id);
    }
    if (!(row.advanced_config || '').includes('# yxy deployment: management entry is internal only')) {
      await hosts.update(access, {id, advanced_config: (row.advanced_config || '') + rule});
    }
    console.log(JSON.stringify({id, domain, access: 'loopback and private LAN only'}));
  }
  process.exit(0);
})().catch(error => { console.error(error.message); process.exit(1); });
