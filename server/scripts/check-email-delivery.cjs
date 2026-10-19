// In-memory transport fixtures only. Never opens SMTP or sends real messages.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { AuthError } = require('../dist/lib/authLimits');
const compiled = fs.readFileSync(path.resolve(__dirname, '../dist/lib/verificationEmail.js'), 'utf8');
const checker = fs.readFileSync(path.resolve(__dirname, 'check-email.cjs'), 'utf8');
const sensitive = 'private-password private@example.test 123456';

function fixture(outcome) {
  const logs = [], calls = [];
  let closed = 0;
  const transport = { sendMail: async mail => { calls.push(mail); if (outcome instanceof Error) throw outcome; return outcome; }, close: () => closed++ };
  const mod = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`, {
    process: { env: { SMTP_HOST: 'smtp.test.invalid', SMTP_PORT: '587', SMTP_USER: 'sender@test.invalid', SMTP_PASS: 'private-password', MAIL_FROM: 'Multraverse <sender@test.invalid>' } },
    console: { info: text => logs.push(JSON.parse(text)), warn: text => logs.push(JSON.parse(text)) },
    setTimeout, clearTimeout, Date,
  })(name => {
    if (name === 'nodemailer') return { createTransport: () => transport };
    if (name === './authLimits') return { AuthError };
    throw Error(`Unexpected import: ${name}`);
  }, mod, mod.exports);
  return { ...mod.exports, logs, calls, closed: () => closed };
}

async function checkCommand(args, failure) {
  const calls = [], logs = [];
  const fakeProcess = { argv: ['node', 'check-email.cjs', ...args], env: { MAIL_FROM: 'sender@test.invalid' } };
  const transport = {
    verify: async () => { calls.push('verify'); if (failure) throw failure; },
    sendMail: async mail => { calls.push(mail); return { accepted: ['recipient@test.invalid'], rejected: [] }; },
    close: () => calls.push('close'),
  };
  await vm.runInNewContext(checker, {
    process: fakeProcess,
    console: { log: value => logs.push(value), error: value => logs.push(value) },
    require: name => name.endsWith('/environment') ? {} : { emailTransport: () => transport, smtpFailureDetails: fixture({ accepted: [] }).smtpFailureDetails },
  });
  return { calls, logs, exitCode: fakeProcess.exitCode };
}

async function main() {
  const success = fixture({ accepted: ['private@example.test'] });
  await success.sendVerificationEmail('private@example.test', '123456');
  assert.equal(success.logs[0].event, 'email_smtp_accepted');
  assert.equal(success.closed(), 1);
  assert(!JSON.stringify(success.logs).includes('private@example.test'));
  assert(!JSON.stringify(success.logs).includes('123456'));

  const failed = fixture(Object.assign(new Error(sensitive), { code: 'EAUTH', responseCode: 535, command: 'AUTH PLAIN', response: sensitive }));
  await assert.rejects(failed.sendVerificationEmail('private@example.test', '123456'), error => error.status === 503 && !error.message.includes(sensitive));
  assert.equal(failed.logs[0].code, 'EAUTH');
  assert.equal(failed.logs[0].responseCode, 535);
  assert.equal(failed.logs[0].command, 'AUTH PLAIN');
  assert.equal(failed.closed(), 1);
  assert(!JSON.stringify(failed.logs).includes(sensitive));
  assert.equal(JSON.stringify(failed.smtpFailureDetails({ code: sensitive, command: sensitive, responseCode: sensitive })), '{"code":"UNKNOWN"}');
  assert.equal(JSON.stringify(failed.smtpFailureDetails(null)), '{"code":"UNKNOWN"}');
  const rejected = fixture({ accepted: [] });
  await assert.rejects(rejected.sendVerificationEmail('private@example.test', '123456'), error => error.status === 503);
  assert.equal(rejected.logs[0].event, 'email_smtp_failed');

  const dryRun = await checkCommand([]);
  assert.deepEqual(dryRun.calls, ['verify', 'close'], 'Default check never sends email');
  const explicit = await checkCommand(['--send-to=recipient@test.invalid']);
  assert.equal(explicit.calls.filter(call => typeof call === 'object').length, 1, 'Explicit test sends exactly one message');
  assert.equal(explicit.calls[1].subject, 'Multraverse SMTP delivery test');
  assert(!/\b\d{6}\b/.test(explicit.calls[1].text), 'Diagnostic message contains no OTP');
  for (const options of [['--send-to='], ['--send-to=one@test.invalid,two@test.invalid'], ['--unknown']]) {
    const invalid = await checkCommand(options);
    assert.equal(invalid.exitCode, 1);
    assert.equal(invalid.calls.length, 0, 'Invalid options never open SMTP');
  }
  const authFailure = await checkCommand([], Object.assign(new Error(sensitive), { code: 'EAUTH', responseCode: 535 }));
  assert.equal(authFailure.exitCode, 1);
  assert(!authFailure.logs.join(' ').includes(sensitive));
  console.log('PASS: SMTP handoff/failure diagnostics, private-error redaction, transport cleanup, no-send default, and explicit single-message delivery test. No real emails sent.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
