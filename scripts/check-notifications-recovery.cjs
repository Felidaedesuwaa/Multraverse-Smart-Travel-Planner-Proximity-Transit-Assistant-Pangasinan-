// Exercise real UI handlers and session renewal without email or database writes.
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), babel = require('@babel/core');
const h = (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) });
const settle = () => new Promise(resolve => setImmediate(resolve));
const values = new Map();
const storage = { getItem: async key => values.get(key) || null, setItem: async (key, value) => values.set(key, value) };
let slots = [], cursor = 0, effects = [], cleanups = [], tree;
const hooks = {
  useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
  useRef(value) { return hooks.useState({ current: value })[0]; },
  useEffect(callback, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, j) => value !== old[j])) effects.push(callback); slots[i] = deps; },
  useCallback(callback, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, j) => value !== old.deps[j])) slots[i] = { deps, callback }; return slots[i].callback; },
};
function load(file, mocks = {}, extra = {}) {
  const code = babel.transformSync(fs.readFileSync(file, 'utf8'), { babelrc: false, configFile: false, plugins: [['@babel/plugin-transform-react-jsx', { pragma: 'h', pragmaFrag: 'Fragment' }], '@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { h, Fragment: 'Fragment', console, Date, Set, Promise, AbortController, setTimeout, clearTimeout, setInterval: () => 1, clearInterval() {}, ...extra })(name => mocks[name] || new Proxy({ __esModule: true, default: name }, { get: (target, key) => target[key] || String(key) }), module, module.exports);
  return module.exports;
}
const text = node => typeof node === 'string' ? node : node?.children?.map(text).join('') || '';
const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...(node.children || []).flatMap(nodes)];
const find = predicate => nodes(tree).find(predicate);
let Screen;
const render = () => { cursor = 0; tree = Screen(); return tree; };
const flush = async () => { for (const effect of effects.splice(0)) { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); } await settle(); render(); };
const reset = () => { cleanups.splice(0).forEach(fn => fn()); slots = []; effects = []; };
const press = async label => { const button = find(node => node.props.onPress && (node.props.accessibilityLabel === label || node.props.label === label || text(node) === label)); assert(button, label); assert(!button.props.disabled); await button.props.onPress(); await settle(); render(); };
let user = { id: 'traveler', email: 'travel@example.com', role: 'EXPLORER' };
const navigations = [], sessions = [];
const navigation = { navigate: (...args) => navigations.push(args), getParent: () => null, reset: value => navigations.push(value) };
const auth = selector => selector({ user }); auth.getState = () => ({ acceptSession: async session => sessions.push(session) });
const common = {
  react: hooks,
  'react-native': { AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) }, StyleSheet: { create: value => value, absoluteFillObject: { position: 'absolute' } }, ...Object.fromEntries(['View', 'Text', 'ScrollView', 'Pressable', 'Modal', 'ActivityIndicator'].map(key => [key, key])) },
  '@react-navigation/native': { useNavigation: () => navigation },
  '@react-native-async-storage/async-storage': { __esModule: true, default: storage },
  '../store/authStore': { useAuthStore: auth },
  '../theme/useAppTheme': { useAppTheme: () => ({ themeStyle: value => value, palette: {} }) },
};
(async () => {
  const notices = ['review', 'expense', 'password'].map(type => ({ id: type, type, title: type, message: `${type} update`, createdAt: new Date().toISOString(), screen: type === 'password' ? 'PasswordRecovery' : 'MyTrips' }));
  let fail = false;
  Screen = load('src/components/NotificationHeader.jsx', { ...common,
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 59, bottom: 34 }) },
    './GeofenceTracking': { useGeofenceTracking: () => ({}), GeofenceControls: 'GPSControls' },
    '../lib/api': { api: { getNotifications: async () => { if (fail) throw Error('offline'); return user.id === 'traveler' ? notices : []; } } },
    '../lib/notificationEvents': { getArrivalNotices: async id => id === 'traveler' ? [{ id: 'arrival', type: 'arrival', title: 'Destination reached', message: 'Dagupan', createdAt: new Date().toISOString(), screen: 'TransitAlarm' }] : [], subscribeNotifications: () => () => {} },
  }).default;
  render(); await flush();
  assert(find(node => node.props.accessibilityLabel === 'Notifications, 4 unread'));
  await press('Notifications, 4 unread');
  assert.equal(find(node => node.type === 'Modal').props.visible, true);
  const passwordNotice = find(node => node.props.onPress && text(node).includes('Wasn’t you?'));
  assert(passwordNotice); passwordNotice.props.onPress(); await settle(); render();
  assert.equal(navigations.at(-1)[0], 'PasswordRecovery');
  assert.equal(find(node => node.type === 'Modal').props.visible, false);
  assert(JSON.parse(values.get('notifications:seen:traveler')).includes('password'));
  await press('Notifications, 3 unread'); await press('Mark all read');
  assert(find(node => node.props.accessibilityLabel === 'Notifications, 0 unread'));
  fail = true; await press('Refresh'); assert(text(tree).includes('could not be refreshed'));
  fail = false; user = { ...user, id: 'another-user' }; reset(); render(); await flush();
  assert(find(node => node.props.accessibilityLabel === 'Notifications, 0 unread'));
  assert(!text(tree).includes('password update'), 'Notifications never leak across accounts');

  reset(); user = { ...user, id: 'traveler' }; let verificationCalls = 0, recoveryCalls = 0;
  const validation = load('src/utils/validation.js');
  const dashboards = load('src/lib/dashboardNavigation.js');
  Screen = load('src/pages/PasswordRecoveryPage.jsx', { ...common,
    '../utils/validation': validation, '../lib/dashboardNavigation': dashboards,
    '../lib/notificationEvents': { notifyUpdates() {} },
    '../lib/api': { api: {
      requestRecoveryCode: async () => ({ challengeId: 'challenge', message: 'Check email', resendAfterSeconds: 60 }),
      verifyPasswordReset: async (id, code) => { verificationCalls++; assert.equal(id, 'challenge'); if (code !== '123456') throw Error('Invalid code'); return { grantToken: 'verified-grant', message: 'Email verified' }; },
      recoverPassword: async (grant, password) => { recoveryCalls++; assert.equal(grant, 'verified-grant'); assert.equal(password, 'Travel_2029'); return { token: 'new-session', user }; },
    } },
  }).default;
  render(); await flush();
  assert(!find(node => node.props.label === 'New password'), 'Passwords are shown only after OTP verification');
  find(node => node.props.label === 'Verification code').props.onChangeText('000000'); render();
  await press('Verify code'); assert(text(tree).includes('Invalid code')); assert.equal(recoveryCalls, 0);
  find(node => node.props.label === 'Verification code').props.onChangeText('123456'); render(); await press('Verify code');
  assert.equal(verificationCalls, 2); assert(find(node => node.props.label === 'New password'));
  assert(!find(node => /Current password|Confirm new password/.test(node.props.label || '')), 'Recovery asks for the new password once');
  find(node => node.props.label === 'New password').props.onChangeText('weak'); render(); await press('Save new password'); assert.equal(recoveryCalls, 0);
  find(node => node.props.label === 'New password').props.onChangeText('Travel_2029'); render(); await press('Save new password');
  assert.equal(recoveryCalls, 1); assert.equal(sessions.at(-1).token, 'new-session');
  assert.equal(navigations.at(-1).routes[0].name, 'User'); assert.equal(navigations.at(-1).routes[0].params.screen, 'Home');
  reset();

  values.set('token', 'old-session'); let logout = 0, release;
  const response = (status, data) => ({ status, ok: status === 200, json: async () => data, headers: { get: () => null } });
  const client = load('src/lib/api.js', {
    'expo-constants': { __esModule: true, default: {} }, 'react-native': { Platform: { OS: 'web' } },
    './storage': { storage }, './notificationEvents': { notifyUpdates() {} },
  }, { process: { env: {} }, fetch: async url => url.endsWith('/password/change') ? new Promise(resolve => { release = () => resolve(response(200, { token: 'new-session', user })); }) : response(401, { error: 'Session revoked' }) });
  client.onUnauthorized(async () => { logout++; });
  const changing = client.api.changePassword('Old_2028', 'Travel_2029'); await settle();
  await assert.rejects(client.api.getNotifications()); assert.equal(logout, 0, 'Polling cannot sign out the user during credential replacement');
  release(); await changing; assert.equal(values.get('token'), 'new-session');
  await assert.rejects(client.api.getNotifications()); assert.equal(logout, 1, 'Ordinary invalid sessions still sign out');
  console.log('PASS: bell unread/read persistence, arrival/expense/review/password updates, account isolation, offline retry, OTP before single password entry, Dashboard redirect, and password/session polling race.');
})().catch(error => { reset(); console.error(error); process.exitCode = 1; });
