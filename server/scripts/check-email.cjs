require('../dist/lib/environment');
const { emailTransport } = require('../dist/lib/verificationEmail');
(async () => {
  let transport;
  try {
    transport = emailTransport();
    await transport.verify();
    console.log('SMTP connection and authentication passed. No email was sent.');
  } catch (error) {
    const hints = {
      EAUTH: 'SMTP authentication failed. Check the sender username and app password in server/.env.',
      EDNS: 'SMTP hostname could not be resolved. Check SMTP_HOST and your DNS connection.',
      ETIMEDOUT: 'SMTP connection timed out. Check the network/firewall and SMTP_PORT (587 or 465).',
      ECONNECTION: 'SMTP connection failed. Check SMTP_HOST, SMTP_PORT and network access.',
      ESOCKET: 'SMTP socket connection failed. Check network permissions, firewall and TLS settings.',
      EENVELOPE: 'SMTP sender or recipient was rejected. Check MAIL_FROM and provider sender restrictions.',
    };
    // Never print raw SMTP errors: they can contain addresses or credentials.
    console.error(error.status === 503 ? error.message : hints[error.code] || 'SMTP check failed. Check the host, port, sender credentials and provider settings.');
    console.error('No email was sent.');
    process.exitCode = 1;
  } finally { transport?.close(); }
})();
