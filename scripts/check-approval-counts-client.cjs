// Exercise the real API client against current and older servers, including complete paginated queues.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), babel = require('@babel/core');
const resources = ['places', 'foods', 'route-prices', 'transit-routes'];
const sizes = [222, 1, 2, 3], requests = [];
let countStatus = 200, queueFailure = false;
const expected = { counts: Object.fromEntries(resources.map((resource, i) => [resource, sizes[i]])), total: sizes.reduce((sum, size) => sum + size, 0) };
const response = (status, data) => ({ status, ok: status === 200, json: async () => data, headers: { get: () => null } });
const code = babel.transformSync(fs.readFileSync('src/lib/api.js', 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
const mocks = {
  'expo-constants': { __esModule: true, default: {} }, 'react-native': { Platform: { OS: 'web' } },
  './storage': { storage: { getItem: async () => null } }, './notificationEvents': { notifyUpdates() {} },
  '../data/lguResources': { lguResources: Object.fromEntries(resources.map(resource => [resource, {}])) },
};
const mod = { exports: {} };
vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {
  process: { env: {} }, AbortController, setTimeout, clearTimeout,
  fetch: async (url, options) => {
    const parsed = new URL(url); requests.push({ path: parsed.pathname, page: Number(parsed.searchParams.get('page')), signal: options.signal });
    if (parsed.pathname.endsWith('/counts')) return response(countStatus, countStatus === 200 ? expected : { error: 'Unavailable endpoint' });
    const resource = parsed.pathname.split('/').at(-1), index = resources.indexOf(resource);
    if (index < 0) return response(404, { error: 'Unknown resource' });
    if (queueFailure && resource === 'foods') return response(503, { error: 'Unavailable queue' });
    const rows = Array.from({ length: sizes[index] }, (_, i) => ({ id: `${resource}:${i}`, approvalStatus: 'pending' }));
    const page = Number(parsed.searchParams.get('page')), limit = Number(parsed.searchParams.get('limit'));
    return response(200, rows.slice((page - 1) * limit, page * limit));
  },
})(name => mocks[name], mod, mod.exports);
(async () => {
  const signal = new AbortController().signal;
  assert.deepEqual(JSON.parse(JSON.stringify(await mod.exports.api.getApprovalCounts(signal))), expected);
  assert.equal(requests.length, 1, 'Current servers use one efficient counts request');
  requests.length = 0; countStatus = 404;
  assert.deepEqual(JSON.parse(JSON.stringify(await mod.exports.api.getApprovalCounts(signal))), expected, 'Older servers count all pending queues');
  assert(requests.some(request => request.path.endsWith('/places') && request.page === 2), 'Fallback includes submissions beyond the first page');
  assert(requests.every(request => request.signal === signal), 'All fallback requests share cancellation and timeout');
  queueFailure = true; await assert.rejects(() => mod.exports.api.getApprovalCounts(signal), error => error.status === 503, 'Queue failures never produce partial or misleading totals'); queueFailure = false;
  for (const status of [401, 403, 500]) {
    countStatus = status; requests.length = 0;
    await assert.rejects(() => mod.exports.api.getApprovalCounts(signal), error => error.status === status);
    assert.equal(requests.length, 1, 'Authorization and server errors never trigger the compatibility fallback');
  }
  console.log('PASS: current-server counts, older-server fallback across all four paginated queues, full totals, shared cancellation, and failure/authorization handling.');
})().catch(error => { console.error(error); process.exitCode = 1; });
