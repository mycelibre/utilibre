// Mail routing and source restrictions are managed by the gateway and SMTP startup units.
export default {
  hostname: 'newsletters.utilibre.org',
  systemAdministratorEmail: 'admin@utilibre.org',
  dataDirectory: '/data',
  environment: 'production',
  tls: { key: '/private/smtp.key', certificate: '/private/smtp.crt' },
};
