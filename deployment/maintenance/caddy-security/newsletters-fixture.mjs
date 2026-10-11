// Synthetic-only setup, never use as production configuration.
export default {
  hostname: 'fixture.invalid',
  dataDirectory: '/fixture-data',
  environment: 'production',
  systemAdministratorEmail: 'fictional@example.invalid',
  tls: {key:'/fixture-certificate/key.pem',certificate:'/fixture-certificate/certificate.pem'},
};
