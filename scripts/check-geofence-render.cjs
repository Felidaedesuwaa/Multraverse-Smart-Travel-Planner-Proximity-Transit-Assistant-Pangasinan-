// Render the real geofence page/map without a device, GPS permissions or API calls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { transformSync } = require('@babel/core');
const component = tag => ({ children, accessibilityLabel, value }) => React.createElement(tag, { 'aria-label': accessibilityLabel, ...(tag === 'input' ? { defaultValue: value } : {}) }, tag === 'input' ? undefined : children);
const native = { View: component('div'), Text: component('span'), TextInput: component('input'), Pressable: component('button'), ScrollView: component('div'), ActivityIndicator: component('div'), Modal: ({ visible, children }) => visible ? children : null, Platform: { OS: 'web' }, StyleSheet: { create: value => value }, AppState: { addEventListener: () => ({ remove() {} }) } };
const palette = { ink: '#103e53', muted: '#77939d', surface: '#fff', background: '#eef1ef', line: '#ccd6d7', tint: '#e3eeee' };
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const result = { exports: {} }; cache.set(file, result.exports);
  const { code } = transformSync(fs.readFileSync(file, 'utf8'), { filename: file, configFile: false, babelrc: false, plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }], '@babel/plugin-transform-modules-commonjs'] });
  function imports(name) {
    if (name === 'react-native') return native;
    if (name === 'react-native-svg') return { __esModule: true, default: component('svg'), Circle: component('circle'), G: component('g'), Path: component('path'), Text: component('text') };
    if (name === 'lucide-react-native') return new Proxy({}, { get: () => component('svg') });
    if (name === 'expo-location') return { Accuracy: { High: 6 } };
    if (name.endsWith('/theme/useAppTheme')) return { useAppTheme: () => ({ palette }) };
    if (name.endsWith('/lib/api')) return { api: {} };
    if (/\/(AdminPage|Card|SuperAdminSelect|ToggleSwitch)$/.test(name)) return { __esModule: true, default: ({ title, children }) => React.createElement('div', null, title, children) };
    if (name.startsWith('.')) {
      const target = path.resolve(path.dirname(file), name);
      if (target.endsWith('.json')) return require(target);
      return load(fs.existsSync(target + '.jsx') ? target + '.jsx' : target + '.js');
    }
    return require(name);
  }
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(imports, result, result.exports);
  cache.set(file, result.exports); return result.exports;
}
const Page = load(path.resolve(__dirname, '../src/pages/AdminGeofences.jsx')).default;
const html = renderToStaticMarkup(React.createElement(Page));
for (const text of ['Geofence Management', 'Add geofence', 'Geofence Map Overview', 'Recent geofence events', 'Zoom in', 'Zone name', 'Pangasinan Province']) assert.ok(html.includes(text), `Missing ${text}`);
const ProvinceMap = load(path.resolve(__dirname, '../src/components/GeofenceMap.jsx')).default;
const point = { lat: 16.043, lng: 120.333 };
assert.doesNotThrow(() => renderToStaticMarkup(React.createElement(ProvinceMap, { zones: [{ id: 'saved-zone', coordinates: point, radiusMeters: 100, monitorable: true, active: true }], selected: point, onPick() {} })));
console.log('PASS: Geofence page renders its form, empty state, province map, zoom controls and events; saved-zone map renders without errors.');
