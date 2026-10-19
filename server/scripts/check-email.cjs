require('../dist/lib/environment');
const { emailTransport, smtpFailureDetails } = require('../dist/lib/verificationEmail');
(async () => {
  let transport;
  try {
    const options = process.argv.slice(2);
    if (options.some(value => !value.startsWith('--send-to=')) || options.length > 1) throw new Error('Use --send-to=ADDRESS only when a test email is intended.');
    const recipient = options[0]?.slice('--send-to='.length);
    if (recipient !== undefined && !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(recipient)) throw new Error('Provide exactly one valid test recipient.');
    transport = emailTransport();
    await transport.verify();
    console.log('SMTP connection and authentication passed.');
    if (recipient === undefined) {
      console.log('No email was sent. This verifies the SMTP connection, not message delivery.');
      return;
    }
    const result = await transport.sendMail({
      from: process.env.MAIL_FROM, to: recipient,
      subject: 'Multraverse SMTP delivery test',
      text: 'This is a single SMTP delivery test from your Multraverse backend. It is not a registration or password reset code. No account was created or changed. If you received this message, the test email reached this mailbox.',
    });
    if (!result.accepted.length) throw new Error('Test recipient was not accepted.');
    console.log(JSON.stringify({ event: 'smtp_test_accepted', acceptedCount: result.accepted.length, rejectedCount: result.rejected.length }));
    console.log('The SMTP provider accepted the test message. Confirm arrival in the recipient inbox or spam folder; acceptance alone does not prove delivery.');
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
    console.error(JSON.stringify({ event: 'smtp_check_failed', ...smtpFailureDetails(error) }));
    process.exitCode = 1;
  } finally { transport?.close(); }
})();
