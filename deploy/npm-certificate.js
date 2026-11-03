// Run as server administrator inside NPM after DNS and TCP 80 are reachable.
// Reuse NPM's certificate creation, storage, nginx and hourly renewal workflow.
// Register without an email rather than inventing an address for the owner.
const {execFile} = require('child_process');
const Access = require('/app/lib/access');
const certificates = require('/app/internal/certificate');
const hosts = require('/app/internal/proxy-host');
const model = require('/app/models/proxy_host');
certificates.requestLetsEncryptSsl = certificate => new Promise((resolve, reject) => {
  execFile('/usr/bin/certbot', ['certonly', '--non-interactive',
    '--config', '/etc/letsencrypt.ini', '--cert-name', 'npm-' + certificate.id,
    '--agree-tos', '--register-unsafely-without-email', '--authenticator', 'webroot',
    '--preferred-challenges', 'http', '--domains', 'www.yxykjai.com'],
  {timeout: 180000}, (error, stdout, stderr) => {
    if (error) reject(new Error(stderr || error.message));
    else resolve(stdout);
  });
});
(async () => {
  const access = new Access();
  await access.load(true);
  const rows = await model.query().where('is_deleted', 0);
  const host = rows.find(row => row.domain_names.length === 1 && row.domain_names[0] === 'www.yxykjai.com');
  if (!host || host.certificate_id) throw new Error('Missing host or certificate already assigned; inspect first.');
  const certificate = await certificates.create(access, {
    provider: 'letsencrypt', domain_names: ['www.yxykjai.com'],
    meta: {letsencrypt_agree: true, letsencrypt_email: '', dns_challenge: false},
  });
  await hosts.update(access, {id: host.id, certificate_id: certificate.id,
    ssl_forced: true, http2_support: true, hsts_enabled: false, hsts_subdomains: false});
  console.log(JSON.stringify({host_id: host.id, certificate_id: certificate.id,
    expires_on: certificate.expires_on, domain: 'www.yxykjai.com', ssl_forced: true}));
  process.exit(0);
})().catch(error => { console.error(error.message); process.exit(1); });
