// Exercise the real mobile permission hook, overlay and test actions without
// requesting device permission or changing a user's settings.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const babel = require('@babel/core');
let frame, pendingEffects = [], permission = { granted: false, canAskAgain: true, status: 'undetermined' };
let grantRequest = false, requests = 0, settings = 0, failRead = false, deferredRead;
const subscriptions = new Set(), channels = [], outputs = [];
const h = (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) });
const slot = initial => {
  const owner = frame, index = owner.index++;
  if (!(index in owner.slots)) owner.slots[index] = typeof initial === 'function' ? initial() : initial;
  return [owner.slots[index], value => { owner.slots[index] = typeof value === 'function' ? value(owner.slots[index]) : value; }];
};
const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
const react = {
  useState: slot, useRef: value => slot({ current: value })[0],
  useCallback(callback, deps) {
    const [previous, set] = slot(null);
    if (previous && same(previous.deps, deps)) return previous.callback;
    set({ callback, deps }); return callback;
  },
  useEffect(callback, deps) {
    const [previous, set] = slot(null);
    if (previous && same(previous.deps, deps)) return;
    const next = { deps }; set(next);
    pendingEffects.push(() => { previous?.cleanup?.(); next.cleanup = callback(); });
  },
};
const native = {
  Platform: { OS: 'ios' }, StyleSheet: { create: value => value, absoluteFillObject: { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 } },
  View: 'View', Pressable: 'Pressable', Text: 'Text', Vibration: { vibrate: () => outputs.push('vibrate'), cancel() {} },
  Linking: { openSettings: async () => { settings++; } },
  AppState: { addEventListener: (_event, callback) => { subscriptions.add(callback); return { remove: () => subscriptions.delete(callback) }; } },
};
const notifications = {
  AndroidImportance: { HIGH: 4 }, setNotificationHandler() {},
  getPermissionsAsync: async () => {
    if (failRead) throw new Error('Permission API unavailable');
    if (deferredRead) { const deferred = deferredRead; deferredRead = null; return deferred; }
    return { ...permission };
  },
  setNotificationChannelAsync: async (id, config) => channels.push({ id, config }),
  requestPermissionsAsync: async options => {
    requests++; assert.equal(options.ios.allowSound, true);
    permission = { granted: grantRequest, canAskAgain: false, status: grantRequest ? 'granted' : 'denied' };
    return { ...permission };
  },
  scheduleNotificationAsync: async value => outputs.push(value),
};
const cache = new Map();
function load(relative) {
  const filename = path.resolve(relative);
  if (cache.has(filename)) return cache.get(filename);
  if (filename.endsWith('.json')) return JSON.parse(fs.readFileSync(filename, 'utf8'));
  const module = { exports: {} };
  const code = babel.transformSync(fs.readFileSync(filename, 'utf8'), { babelrc: false, configFile: false, plugins: [['@babel/plugin-transform-react-jsx', { pragma: 'h' }], '@babel/plugin-transform-modules-commonjs'] }).code;
  const imports = name => {
    if (name === 'react') return react;
    if (name === 'react-native') return native;
    if (name === 'expo-notifications') return notifications;
    if (name === '@react-navigation/native') return { useIsFocused: () => true };
    if (name === 'lucide-react-native') return new Proxy({}, { get: (_, key) => key });
    if (name.endsWith('WorkspaceMotion')) return { FeedbackPressable: 'Pressable' };
    if (name.endsWith('useAppTheme')) return { useAppTheme: () => ({ palette: { primary: '#123F52', ink: '#163F49', onPrimary: '#FFF9EF', paper: '#F4ECDD', surface: '#FFFFFF', muted: '#63726A', line: '#E4E6DB' } }) };
    const target = path.resolve(path.dirname(filename), name);
    return load(['', '.native.js', '.js', '.jsx'].map(suffix => target + suffix).find(candidate => fs.existsSync(candidate)));
  };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { h, console, setInterval, clearInterval })(imports, module, module.exports);
  cache.set(filename, module.exports); return module.exports;
}
const useAccess = load('src/hooks/useTransitNotificationPermission.js').useTransitNotificationPermission;
const Gate = load('src/components/TransitNotificationGate.jsx').default;
const Tester = load('src/components/TransitAlertTester.jsx').default;
const owner = { index: 0, slots: [] }, testerOwner = { index: 0, slots: [] };
const renderAccess = () => { frame = owner; frame.index = 0; return useAccess(); };
const renderTester = access => { frame = testerOwner; frame.index = 0; return Tester({ radius: 500, notificationAccess: access }); };
const settle = () => new Promise(resolve => setImmediate(resolve));
async function flush() { const effects = pendingEffects; pendingEffects = []; effects.forEach(effect => effect()); await settle(); }
const all = node => !node || typeof node !== 'object' ? [] : [node, ...(node.children || []).flatMap(all)];
const text = node => typeof node === 'string' ? node : node?.children?.map(text).join('') || '';

(async () => {
  let access = renderAccess();
  assert(access.blocked, 'Unknown permission must never expose usable alarm actions');
  await flush(); access = renderAccess();
  assert(access.blocked);
  // First request is declined: retain the dark mask and settings action.
  await access.requestAccess(); access = renderAccess();
  assert(access.blocked && access.denied); assert.equal(requests, 1);
  const gate = Gate({ access, children: h('View', {}, 'modes') });
  assert.equal(gate.children[0].props.pointerEvents, 'none');
  assert.equal(gate.children[0].props.accessibilityElementsHidden, true);
  assert.equal(gate.children[0].props.importantForAccessibility, 'no-hide-descendants');
  const overlay = all(gate).find(node => node.props.accessibilityRole === 'button');
  assert.equal(text(overlay), 'Turn on push notifications in Multraverse to use this feature.');
  assert.equal(overlay.props.style({ pressed: false }).backgroundColor, 'transparent');
  const tester = renderTester(access);
  const testActions = all(tester).filter(node => node.type === 'Pressable');
  assert.equal(testActions.length, 5);
  for (const button of testActions) assert.equal(button.props.disabled, true, 'All modes and both delivery actions must be blocked');
  const immediate = testActions.find(button => text(button) === 'Test alert now');
  await immediate.props.onPress(); assert.equal(outputs.length, 0); assert.equal(requests, 1);
  await overlay.props.onPress(); assert.equal(settings, 1); assert.equal(requests, 1, 'A denial must direct the user to Settings rather than repeatedly prompt');
  // Returning from Settings automatically removes the overlay.
  permission = { granted: true, canAskAgain: true, status: 'granted' };
  subscriptions.forEach(callback => callback('active')); await settle(); access = renderAccess();
  assert.equal(access.blocked, false);
  const child = h('View', {}, 'enabled'); assert.equal(Gate({ access, children: child }), child);
  assert(all(renderTester(access)).filter(node => node.type === 'Pressable').every(node => !node.props.disabled));
  await all(renderTester(access)).find(node => node.type === 'Pressable' && text(node) === 'Test alert now').props.onPress();
  assert.equal(outputs[0], 'vibrate', 'Allowed modes deliver without reopening the screen');
  // A pending old read must not undo a newer grant.
  let resolveRead; deferredRead = new Promise(resolve => { resolveRead = resolve; });
  const oldRead = access.refresh(); await access.refresh();
  resolveRead({ granted: false, canAskAgain: false }); await oldRead;
  assert.equal(renderAccess().blocked, false);
  // Revoking permission while backgrounded masks every method on resume.
  permission = { granted: false, canAskAgain: false, status: 'denied' };
  subscriptions.forEach(callback => callback('active')); await settle();
  assert(renderAccess().blocked);
  // A read failure cannot unlock the modes; retry recovers without a restart.
  failRead = true; await renderAccess().refresh(); access = renderAccess();
  assert(access.blocked && access.error);
  failRead = false; permission = { granted: false, canAskAgain: true, status: 'undetermined' };
  await access.refresh(); grantRequest = true; native.Platform.OS = 'android';
  const firstRequest = renderAccess().requestAccess(), duplicateRequest = renderAccess().requestAccess();
  await Promise.all([firstRequest, duplicateRequest]);
  assert.equal(requests, 2, 'Repeated taps must trigger only one new OS prompt');
  assert.deepEqual(channels.map(channel => channel.id), ['transit-vibrate-v2', 'transit-sound-v2', 'transit-push-v2']);
  assert.equal(renderAccess().blocked, false);
  native.Platform.OS = 'web'; assert.equal(renderAccess().blocked, false);
  for (const state of [...owner.slots, ...testerOwner.slots]) state?.cleanup?.();
  console.log('PASS: decline overlay, inaccessible disabled modes, test delivery blocked, Settings recovery, resume revocation, stale reads, API failure, duplicate taps and Android channel setup.');
})().catch(error => { console.error(error); process.exitCode = 1; });
