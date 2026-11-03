// Run only as the server administrator inside the existing NPM container.
// Uses NPM's internal management API so its database, generated config and audit
// record stay consistent. Does not change any existing host or user credentials.
const Access = require('/app/lib/access');
const hosts = require('/app/internal/proxy-host');
const model = require('/app/models/proxy_host');

(async () => {
  const access = new Access();
  await access.load(true);
  const existing = await model.query().where('is_deleted', 0);
  if (existing.some(row => row.domain_names.includes('www.yxykjai.com'))) {
    throw new Error('Domain already exists; inspect its host before changing it.');
  }
  const row = await hosts.create(access, {
    domain_names: ['www.yxykjai.com'],
    forward_scheme: 'http',
    forward_host: 'yxy-web',
    forward_port: 80,
    access_list_id: 0,
    certificate_id: 0,
    ssl_forced: false,
    caching_enabled: false,
    block_exploits: true,
    allow_websocket_upgrade: false,
    http2_support: false,
    hsts_enabled: false,
    hsts_subdomains: false,
    locations: [],
    advanced_config: 'client_max_body_size 24m;\nproxy_read_timeout 70s;',
    meta: {},
  });
  console.log(JSON.stringify({id: row.id, domain_names: row.domain_names,
    forward_host: row.forward_host, meta: row.meta}));
  process.exit(0);
})().catch(error => { console.error(error.message); process.exit(1); });
