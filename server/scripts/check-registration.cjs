const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { registrationDetails, registrationEmailError, registrationPasswordError, RegistrationError } = require('../dist/lib/registration');
const { ensureEmailDomain } = require('../dist/lib/emailDomain');

(async () => {
  // Load the exact frontend validators without changing the package module type.
  const code = fs.readFileSync(path.resolve(__dirname, '../../src/utils/validation.js'), 'utf8');
  const front = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
  const valid = { firstName: ' Juan ', middleName: ' reyes ', surname: 'dela  Cruz', email: ' Juan.Delacruz@GMAIL.com ', password: 'Lakbay_2026' };
  assert.deepEqual(registrationDetails(valid), { name: 'Juan R. dela Cruz', email: 'juan.delacruz@gmail.com', password: 'Lakbay_2026' });
  assert.equal(front.registrationFullName(valid.firstName, valid.middleName, valid.surname), 'Juan R. dela Cruz');
  assert.equal(registrationDetails({ ...valid, middleName: '' }).name, 'Juan dela Cruz');
  assert.equal(registrationDetails({ ...valid, firstName: 'José', middleName: 'ñunez', surname: "O'Neill-Santos" }).name, "José Ñ. O'Neill-Santos");
  for (const value of ['', ' ', 'A1', '@Juan', 'Juan_', '<script>', 'a'.repeat(36), {}, 1]) {
    assert.throws(() => registrationDetails({ ...valid, firstName: value }), RegistrationError);
    assert.ok(front.validateNamePart(value, 'First name'));
  }
  for (const password of ['', 'shortA1', 'lowercase1', 'CapitalOnly', 'Has Space1', 'Newline1\n', 'TabsHere1\t', 'NoBang12!', 'NoDot12.', 'Slash12\\', 'Emoji12😀', 'Éclair123', 'A1' + 'a'.repeat(71), {}, null]) {
    assert.ok(registrationPasswordError(password));
    assert.equal(front.validatePassword(password), registrationPasswordError(password));
  }
  for (const password of ['Capital1', 'With_Under1', 'With-Dash1', 'With@Sign1', 'A1' + 'a'.repeat(70)]) {
    assert.equal(registrationPasswordError(password), null);
    assert.equal(front.validatePassword(password), null);
  }
  for (const email of ['', 'invalid', 'a@@gmail.com', 'a..b@gmail.com', '.a@gmail.com', 'a.@gmail.com', 'a b@gmail.com', 'a@-gmail.com', 'a@gmail..com', 'a@123.123', 'a@example.com', 'A@Sub.Example.ORG', 'a@domain.test', 'a@domain.invalid', 'a@localhost', 'a'.repeat(65) + '@gmail.com', {}, null]) {
    assert.ok(registrationEmailError(email));
    assert.equal(front.validateRegistrationEmail(email), registrationEmailError(email));
  }
  for (const email of ['juan+travel@gmail.com', 'a_b@outlook.com', 'a@school.edu.ph', 'a@xn--bcher-kva.de']) {
    assert.equal(registrationEmailError(email), null); assert.equal(front.validateRegistrationEmail(email), null);
  }
  assert.equal(front.validateEmail('legacy@example.com'), null, 'New registration rules must not lock out existing logins');
  assert.ok(front.validateConfirmPassword(valid.password, 'different'));
  assert.equal(front.validateConfirmPassword(valid.password, valid.password), null);
  for (const body of [null, [], {}, { name: 'Legacy Full Name', email: valid.email, password: valid.password }, { ...valid, surname: '' }]) assert.throws(() => registrationDetails(body), RegistrationError);
  await ensureEmailDomain('test@gmail.com', async () => [{ exchange: 'mail.gmail.com', priority: 10 }]);
  for (const records of [[], [{ exchange: '.', priority: 0 }], [{ exchange: '', priority: 0 }]]) await assert.rejects(ensureEmailDomain('test@domain.org', async () => records), e => e.status === 400);
  for (const code of ['ENODATA', 'ENOTFOUND', 'ETIMEOUT', 'ESERVFAIL', 'ECANCELLED']) {
    await assert.rejects(ensureEmailDomain('test@domain.org', async () => { throw Object.assign(new Error('DNS'), { code }); }), e => e.status === (['ENODATA', 'ENOTFOUND'].includes(code) ? 400 : 503));
  }
  console.log('PASS: frontend/server validation parity, name normalization and initials, optional middle name, email syntax/reserved domains, password rules, existing login compatibility, and DNS failure handling.');
})().catch(error => { console.error(error); process.exitCode = 1; });
