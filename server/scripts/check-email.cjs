const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const { emailTransport } = require('../dist/lib/verificationEmail');
(async () => {
  let transport;
  try {
    transport = emailTransport();
    await transport.verify();
    console.log('SMTP connection and authentication passed. No email was sent.');
  } catch (error) {
    console.error(error.status === 503 ? error.message : 'SMTP check failed. Check the host, port, sender credentials and provider settings. No email was sent.');
    process.exitCode = 1;
  } finally { transport?.close(); }
})();
