// Exercise real store and login actions with simulated service responses; no API writes.
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const babel = require('@babel/core');
const { create } = require('zustand');
const h = (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) });
const load = (file, mocks) => {
  const code = babel.transformSync(fs.readFileSync(file, 'utf8'), { filename: file, babelrc: false, configFile: false, plugins: [['@babel/plugin-transform-react-jsx', { pragma: 'h', pragmaFrag: 'Fragment' }], '@babel/plugin-transform-modules-commonjs'] }).code;
  const result = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { h, Fragment: 'Fragment' })(name => mocks[name] || require(name), result, result.exports);
  return result.exports;
};
const flatten = node => node && typeof node === 'object' ? [node, ...(node.children || []).flatMap(flatten)] : [];
const component = name => ({ __esModule: true, default: name });
(async () => {
  const saved = new Map(), resets = [], calls = [];
  const session = { token: 'verified-session', user: { id: 'account', role: 'ADMIN' } };
  const api = {
    login: async () => ({ mfaRequired: true, challengeToken: 'password-proof' }),
    setupMfa: async token => { assert.equal(token, 'password-proof'); return { setupRequired: true, secret: 'SETUPKEY' }; },
    verifyMfa: async (token, code) => { calls.push([token, code]); return session; },
    logout: async () => { throw Error('Offline'); },
  };
  const storage = { getItem: async key => saved.get(key), setItem: async (key, value) => saved.set(key, value), removeItem: async key => saved.delete(key) };
  const store = load('src/store/authStore.js', { zustand: { create }, '../lib/api': { api, onUnauthorized() {} }, '../lib/storage': { storage }, '../lib/transitTracking': { stopTransitAlarm: async () => {} } }).useAuthStore;
  const first = await store.getState().login('admin@gmail.com', 'Travel_2026');
  assert.equal(first.mfaRequired, true); assert.equal(store.getState().isAuthenticated, false);
  assert.equal(saved.has('token'), false, 'Password proof must never enter token storage');
  const state = []; let index = 0;
  const useState = initial => {
    const slot = index++;
    if (!(slot in state)) state[slot] = initial;
    return [state[slot], value => { state[slot] = typeof value === 'function' ? value(state[slot]) : value; }];
  };
  const useRef = initial => { const [value] = useState({ current: initial }); return value; };
  const hook = () => store.getState(); hook.getState = store.getState;
  const mocks = { useAuthStore: hook };
  const Page = load('src/pages/LoginPage.jsx', {
    react: { useState, useRef }, 'react-native': { Pressable: 'Pressable', Text: 'Text', StyleSheet: { create: value => value } },
    '@react-navigation/native': { useNavigation: () => ({ reset: value => resets.push(value) }) },
    '../theme/useAppTheme': { useAppTheme: () => ({ themeStyle: value => value }) },
    '../components/AuthInput': component('Input'), '../components/LoginLayout': component('Layout'),
    '../components/SummerUI': { TravelButton: 'Button' }, '../store/authStore': mocks,
    '../utils/validation': { validateEmail: () => null }, '../lib/api': { api },
  }).default;
  const render = () => { index = 0; return flatten(Page()); };
  let tree = render();
  tree.find(node => node.type === 'Input' && node.props.label === 'Email').props.onChangeText('admin@gmail.com');
  tree.find(node => node.type === 'Input' && node.props.label === 'Password').props.onChangeText('Travel_2026');
  tree = render(); await tree.find(node => node.type === 'Button').props.onPress();
  tree = render(); assert(tree.some(node => node.children.includes('SETUPKEY')));
  assert.equal(resets.length, 0, 'MFA challenge does not navigate into an admin dashboard');
  assert.equal(saved.has('token'), false);
  tree.find(node => node.type === 'Input').props.onChangeText('123456');
  tree = render(); await tree.find(node => node.type === 'Button').props.onPress();
  assert.deepEqual(calls, [['password-proof', '123456']]);
  assert.equal(saved.get('token'), session.token); assert.equal(store.getState().isAuthenticated, true);
  assert.equal(resets[0].routes[0].name, 'Admin');
  await store.getState().logout();
  assert.equal(saved.has('token'), false); assert.equal(saved.has('user'), false);
  assert.equal(store.getState().isAuthenticated, false, 'Offline logout still clears the device');
  saved.set('token', 'stale'); saved.set('user', '{invalid-json');
  await store.getState().init(); assert.equal(store.getState().isAuthenticated, false);
  console.log('PASS: MFA password proof is not stored, authenticator enrollment/code submission gates admin navigation, verified session is accepted, offline logout clears credentials, and corrupt cached profiles recover safely.');
})().catch(error => { console.error(error); process.exitCode = 1; });
