// Render real JSX in loading, empty and populated states without API writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { transformSync } = require('@babel/core');
let states = [], index = 0;
let role = 'ADMIN';
const component = tag => ({ children, accessibilityLabel, value }) => React.createElement(tag, { 'aria-label': accessibilityLabel, ...(tag === 'input' ? { defaultValue: value } : {}) }, tag === 'input' ? undefined : children);
const native = { View: component('div'), Text: component('span'), TextInput: component('input'), Pressable: component('button'), ScrollView: component('div'), ActivityIndicator: component('div'), Modal: ({ visible, children }) => visible ? children : null, StyleSheet: { create: value => value }, useWindowDimensions: () => ({ width: 1440, height: 900 }) };
const file = path.resolve(__dirname, '../src/pages/AdminUsers.jsx');
const { code } = transformSync(fs.readFileSync(file, 'utf8'), { filename: file, babelrc: false, configFile: false, plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }], '@babel/plugin-transform-modules-commonjs'] });
const result = { exports: {} };
function imports(name) {
  if (name === 'react') return { ...React, useState: initial => React.useState(index < states.length ? states[index++] : initial) };
  if (name === 'react-native') return native;
  if (name === 'lucide-react-native') return new Proxy({}, { get: () => component('svg') });
  if (name.endsWith('/theme/useAppTheme')) return { useAppTheme: () => ({ themeStyle: value => value, themeColor: value => value }) };
  if (name.endsWith('/theme/colors')) return { colors: { oceanBlue: '#0B3C5D', white: '#fff' } };
  if (name.endsWith('/lib/api')) return { api: {} };
  if (name.endsWith('/store/authStore')) return { useAuthStore: selector => selector({ user: { role } }) };
  if (name.endsWith('/components/AccountActionButton')) return { __esModule: true, default: ({ label }) => React.createElement('button', { 'aria-label': label }) };
  if (name.endsWith('/components/ExplorerAccountAction')) return { __esModule: true, default: () => null };
  if (/\/(AdminPage|Card|WovenDivider)$/.test(name)) return { __esModule: true, default: ({ title, subtitle, children }) => React.createElement('div', null, title, subtitle, children) };
  return require(name);
}
vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(imports, result, result.exports);
function render(overrides = []) { states = overrides; index = 0; return renderToStaticMarkup(React.createElement(result.exports.default)); }
const loading = render(); assert.ok(loading.includes('Loading Explorer accounts'));
const summary = { total: 0, verified: 0, newThisWeek: 0, newLastWeek: 0, totalTrips: 0, completedTrips: 0 };
const empty = render([[], summary, 0, '', '', 1, 0, false, '', null]); assert.ok(empty.includes('No Explorer accounts yet'));
const user = { id: 'fixture-id', name: 'Render fixture', email: 'fixture@example.test', role: 'EXPLORER', createdAt: '2026-10-02T00:00:00Z', emailVerifiedAt: '2026-10-02T00:01:00Z', tripCount: 7, location: 'Dagupan' };
const populated = render([[user], { ...summary, total: 1, verified: 1, totalTrips: 7 }, 1, '', '', 1, 0, false, '', null]);
for (const text of ['Render fixture', 'fixture@example.test', 'Verified', '7', 'Edit information for Render fixture']) assert.ok(populated.includes(text), `Missing ${text}`);
assert.ok(!populated.includes('Delete account Render fixture'), 'Admin must not have the deletion action');
role = 'SUPERADMIN';
const superadmin = render([[user], { ...summary, total: 1, verified: 1, totalTrips: 7 }, 1, '', '', 1, 0, false, '', null]);
assert.ok(superadmin.includes('Delete account Render fixture'), 'Super Admin must have the deletion action');
assert.ok(!populated.includes('Compose email') && !superadmin.includes('Compose email'), 'Email action must be removed');
for (const text of ['Pro users', 'Invite User', 'Super Admin', 'LGU accounts', 'suspended']) assert.ok(!populated.includes(text), `Unexpected ${text}`);
console.log('PASS: Explorer Users render with edit actions and Super Admin-only delete actions; loading, empty and account scope preserved.');
