const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const babel = require('@babel/core');
const { spawnSync } = require('node:child_process');
const code = babel.transformSync(fs.readFileSync('src/lib/api.js', 'utf8'), {
  babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code;
function load(hostname, url, fetch) {
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {
    process: { env: { EXPO_PUBLIC_API_URL: url } }, window: { location: { hostname } }, fetch,
  })(name => ({
    'expo-constants': { default: {}, __esModule: true },
    'react-native': { Platform: { OS: 'web' } },
    './storage': { storage: { getItem: async () => null } },
    './notificationEvents': {}, '../data/lguResources': {},
  })[name], module, module.exports);
  return module.exports;
}
(async () => {
  let calls = 0;
  const missing = load('travel.vercel.app', undefined, () => { calls++; });
  await assert.rejects(missing.api.register({}), /not configured/);
  assert.equal(calls, 0, 'Hosted web must never contact visitor localhost');
  assert.equal(load('localhost').BASE_URL, 'http://localhost:3001');
  let requested;
  const configured = load('travel.vercel.app', ' https://api.example.com/ ', async url => {
    requested = url;
    return { ok: true, json: async () => ({ challengeId: 'signup' }) };
  });
  assert.equal((await configured.api.register({})).challengeId, 'signup');
  assert.equal(requested, 'https://api.example.com/api/auth/register');
  const offline = load('travel.vercel.app', 'https://api.example.com', async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(offline.api.register({}), /Unable to connect/);
  for (const [value, expected] of [
    ['', 1], ['http://localhost:3001', 1], ['https://api.example.com/api', 1],
    ['https://192.168.1.2', 1], ['https://api.example.com/', 0],
  ]) {
    const result = spawnSync(process.execPath, ['scripts/check-web-deployment.cjs'], {
      env: { ...process.env, VERCEL: '1', EXPO_PUBLIC_API_URL: value }, encoding: 'utf8',
    });
    assert.equal(result.status, expected, `Deployment guard: ${value}`);
  }
  console.log('Hosted registration routing, local development, connection errors, and Vercel configuration checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
