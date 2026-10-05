// Exercise the page's real event handlers with mocked hooks and device APIs.
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), babel = require('@babel/core');
const map = require('../src/data/pangasinanMap.json');
let slots = [], cursor = 0, alarms = [], watches = 0, denyGPS = false;
const fix = { timestamp: Date.now(), coords: { latitude: 16.0424, longitude: 120.3375, accuracy: 10 } };
const route = { id: 'test', name: 'Test route', lengthKm: 52.8, stops: [{ name: 'Dagupan', areaId: 'dagupan', lat: 16.0424, lng: 120.3375 }, { name: 'Alaminos', areaId: 'alaminos', lat: 16.1565, lng: 119.9804 }] };
const h = (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) });
const hook = initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; };
const mocks = {
  react: { useState: hook, useRef: value => hook({ current: value })[0], useEffect() {} },
  'react-native': { Platform: { OS: 'android' }, useWindowDimensions: () => ({ width: 900 }) },
  'expo-location': { Accuracy: { High: 4 }, requestForegroundPermissionsAsync: async () => ({ granted: !denyGPS }), getCurrentPositionAsync: async () => ({ ...fix, timestamp: Date.now() }), watchPositionAsync: async () => { watches++; return { remove() {} }; } },
  '../theme/useAppTheme': { useAppTheme: () => ({ themeStyle: s => s, themeColor: c => c }) },
  '../data/pangasinanMap.json': map,
  '../lib/api': { api: { searchTransitRoutes: async () => ({ routes: [route] }) } },
  '../lib/transitFare': { estimateTraditionalJeepneyFare: km => Number.isFinite(km) && km >= 0 ? Math.round((14 + Math.max(0, km - 4) * 2) * 100) / 100 : null },
  '../lib/transitGeometry': { municipality: p => (p.lat === 16.1565 ? 'alaminos' : 'dagupan'), distanceMeters: () => 0, isArrival: () => false },
  '../lib/transitTracking': { stopTransitAlarm: async () => {}, startTransitAlarm: async value => alarms.push(value) },
  '../store/authStore': { useAuthStore: { getState: () => ({ user: { id: 'traveler' } }) } },
};
mocks['react-native'].StyleSheet = { create: value => value };
const code = babel.transformSync(fs.readFileSync('src/pages/TransitAlarm.jsx', 'utf8'), { babelrc: false, configFile: false, plugins: [['@babel/plugin-transform-react-jsx', { pragma: 'h' }], '@babel/plugin-transform-modules-commonjs'] }).code;
const moduleValue = { exports: {} };
vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { h, Date, console, setInterval, clearInterval })(name => mocks[name] || new Proxy({}, { get: (_, key) => String(key) }), moduleValue, moduleValue.exports);
const render = () => { cursor = 0; return moduleValue.exports.default(); };
const text = node => typeof node === 'string' ? node : node?.children?.map(text).join('') || '';
const find = (node, label) => {
  if (!node || typeof node !== 'object') return null;
  if (node.props.onPress && text(node) === label) return node;
  for (const child of node.children || []) { const found = find(child, label); if (found) return found; }
  return null;
};
const click = async label => { const button = find(render(), label); assert(button, label); assert(!button.props.disabled, `${label} disabled`); await button.props.onPress(); };
(async () => {
  await click('Find Routes');
  assert.match(text(render()), /Estimated full-route fare: \u20b1111\.60/);
  assert(!text(render()).includes('Fare unconfirmed'));
  await click('Set Stop Alert');
  assert.equal(watches, 1);
  await click('Sound');
  await click('Enable Alarm');
  assert.equal(alarms.at(-1).mode, 'sound');
  assert.equal(alarms.at(-1).stopIndex, 1);
  await click('Disable Alarm');
  await click('Notify');
  await click('Enable Alarm');
  assert.equal(watches, 2, 'Enable Alarm starts GPS without Track Route');
  assert.equal(alarms.at(-1).mode, 'push');
  await click('Disable Alarm');
  await click('Vibrate');
  await click('Enable Alarm');
  assert.equal(alarms.at(-1).mode, 'vibrate');
  await click('Disable Alarm');
  denyGPS = true;
  await click('Enable Alarm');
  assert.equal(alarms.length, 3, 'Denied GPS must not arm an alarm');
  console.log('Transit page checks passed: Set Stop Alert starts GPS; Enable Alarm starts GPS; all three modes reach the mobile service; denied GPS prevents arming.');
})().catch(error => { console.error(error); process.exitCode = 1; });
