const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const babel = require('@babel/core');
const { create } = require('zustand');
const { StackRouter } = require('@react-navigation/routers');

assert.equal(require('../app.json').expo.ios.infoPlist.UIViewControllerBasedStatusBarAppearance, false,
  'iOS builds must use app-wide status-bar control to match React Native StatusBar');

const h = (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) });
function load(file, mocks) {
  const code = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    babelrc: false, configFile: false,
    plugins: [['@babel/plugin-transform-react-jsx', { pragma: 'h', pragmaFrag: 'Fragment' }], '@babel/plugin-transform-modules-commonjs'],
  }).code;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { h, Fragment: 'Fragment' })(
    name => mocks[name] || { __esModule: true, default: name }, module, module.exports,
  );
  return module.exports;
}
const settle = () => new Promise(resolve => setImmediate(resolve));
const find = (node, type) => {
  if (node?.type === type) return node;
  for (const child of node?.children || []) { const match = find(child, type); if (match) return match; }
};
function routeOptions(tree) {
  const routeNames = [];
  function visit(node) {
    if (node?.type === 'RootScreen') routeNames.push(node.props.name);
    else for (const child of node?.children || []) visit(child);
  }
  visit(find(tree, 'RootNavigator'));
  return { routeNames, routeParamList: {}, routeGetIdList: {}, routeKeyChanges: [] };
}

async function check(platform, role, cached, dark) {
  const user = { id: 'traveler', role, municipality: 'dagupan' };
  const saved = new Map([['preferences', 'dark'], ['planner:v1:traveler:plan', 'saved trip']]);
  if (cached) { saved.set('token', 'old-token'); saved.set('user', JSON.stringify(user)); }
  let stopped = 0, profiles = 0, preferencesInitialized = 0, appStateListener;
  const store = load('src/store/authStore.js', {
    zustand: { create },
    '../lib/api': { api: {
      login: async () => ({ token: 'new-token', user }),
      getMe: async () => { profiles++; return user; },
    }, onUnauthorized() {} },
    '../lib/storage': { storage: {
      getItem: async key => saved.get(key),
      setItem: async (key, value) => saved.set(key, value),
      removeItem: async key => saved.delete(key),
    } },
    '../lib/transitTracking': { stopTransitAlarm: async () => { stopped++; } },
  }).useAuthStore;
  const useAuthStore = selector => selector(store.getState());
  useAuthStore.getState = store.getState;
  let slots = [], cursor = 0, effects = [], stacks = 0;
  const App = load('src/App.jsx', {
    react: {
      useState(initial) {
        const i = cursor++;
        if (!(i in slots)) slots[i] = initial;
        return [slots[i], value => { slots[i] = value; }];
      },
      useEffect(effect, dependencies) {
        const i = cursor++;
        if (!slots[i] || dependencies.some((value, index) => value !== slots[i][index])) effects.push(effect);
        slots[i] = dependencies;
      },
    },
    'react-native': {
      Platform: { OS: platform }, View: 'View', StatusBar: 'StatusBar',
      useWindowDimensions: () => ({ width: 390 }),
      StyleSheet: { create: value => value },
      AppState: { addEventListener: (_, listener) => { appStateListener = listener; return { remove() {} }; } },
    },
    'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider' },
    'expo-font': { useFonts: () => [true] },
    '@react-navigation/native': { NavigationContainer: 'NavigationContainer', DarkTheme: { colors: {} }, DefaultTheme: { colors: {} } },
    '@react-navigation/native-stack': { createNativeStackNavigator() {
      const name = stacks++ === 0 ? 'Root' : 'Nested';
      return { Navigator: `${name}Navigator`, Screen: `${name}Screen` };
    } },
    './theme/useAppTheme': { useAppTheme: () => ({
      isDark: dark, background: dark ? '#102d35' : '#fff', surface: '#fff', text: '#000',
      themeStyle: style => style, themeColor: color => color, palette: {},
    }) },
    './theme/colors': { colors: { sunsetCoral: '#f00' } },
    './store/authStore': { useAuthStore },
    './store/preferencesStore': { usePreferencesStore: { getState: () => ({
      init: async () => { preferencesInitialized++; }, currency: 'PHP',
    }) } },
    './components/WorkspaceMotion': { WorkspaceMotionProvider: 'WorkspaceMotionProvider' },
  }).default;
  const render = () => { cursor = 0; return App(); };
  assert(!find(render(), 'RootNavigator'), 'Startup must wait for session initialization');
  effects.splice(0).forEach(effect => effect());
  await settle();
  const native = platform !== 'web';
  assert.equal(store.getState().isAuthenticated, !native && cached);
  assert.equal(profiles, !native && cached ? 1 : 0, 'Native must not refresh a cached profile');
  assert.equal(stopped, native ? 1 : 0);
  assert.equal(preferencesInitialized, 1);
  assert.equal(saved.get('preferences'), 'dark');
  assert.equal(saved.get('planner:v1:traveler:plan'), 'saved trip');
  const statusBar = find(render(), 'StatusBar');
  assert.equal(statusBar.props.barStyle, dark ? 'light-content' : 'dark-content');
  assert.equal(statusBar.props.hidden, false, 'Phone status must remain visible');
  assert.equal(statusBar.props.backgroundColor, dark ? '#102d35' : '#fff');
  if (native) {
    assert(!saved.has('token') && !saved.has('user'), 'Previous credentials must be removed');
    assert.equal(find(render(), 'RootNavigator').props.initialRouteName, 'Login');
    assert.equal(find(render(), 'NavigationContainer').props.linking, undefined, 'Launch URLs must not replace mobile login');
  } else {
    assert(find(render(), 'NavigationContainer').props.linking);
    if (!cached) assert.equal(find(render(), 'RootNavigator').props.initialRouteName, 'Landing');
  }
  const router = StackRouter({ initialRouteName: find(render(), 'RootNavigator').props.initialRouteName });
  let navigationState = router.getInitialState(routeOptions(render()));
  if (native) assert.equal(navigationState.routes[0].name, 'Login');
  assert(await store.getState().login('traveler@example.com', 'password'));
  const expected = { SUPERADMIN: 'SuperAdmin', ADMIN: 'Admin', LGU: 'LGU', EXPLORER: 'User' }[role];
  assert.equal(find(render(), 'RootScreen').props.name, expected, 'Successful login must open the correct workspace');
  if (role === 'EXPLORER') {
    const userStack = find(find(render(), 'RootScreen').props.component(), 'NestedNavigator');
    assert(userStack);
    for (const option of ['statusBarStyle', 'statusBarHidden', 'statusBarAnimation']) {
      assert.equal(userStack.props.screenOptions[option], undefined, `${option} must not invoke iOS controller-based status-bar APIs`);
    }
  }
  navigationState = router.getStateForRouteNamesChange(navigationState, routeOptions(render()));
  assert.equal(navigationState.routes[0].name, expected);
  assert.equal(router.getStateForAction(navigationState, { type: 'GO_BACK' }, routeOptions(render())), null, 'Login must not remain in the back stack');
  const beforeResume = stopped;
  appStateListener('inactive');
  appStateListener('background');
  appStateListener('active');
  assert(store.getState().isAuthenticated, 'Resuming must preserve the active session');
  assert.equal(stopped, beforeResume, 'Resuming must preserve transit alerts');
  await store.getState().logout();
  assert.equal(find(render(), 'RootNavigator').props.initialRouteName, native ? 'Login' : 'Landing');
  navigationState = router.getStateForRouteNamesChange(navigationState, routeOptions(render()));
  assert.equal(navigationState.routes[0].name, native ? 'Login' : 'Landing');
}

(async () => {
  for (const platform of ['ios', 'android', 'web']) {
    for (const role of ['EXPLORER', 'LGU', 'ADMIN', 'SUPERADMIN']) {
      for (const cached of [false, true]) {
        for (const dark of [false, true]) await check(platform, role, cached, dark);
      }
    }
  }
  for (const [platform, insets] of [
    ['ios', { top: 59, left: 0, right: 0 }],
    ['ios', { top: 0, left: 59, right: 59 }],
    ['android', { top: 24, left: 0, right: 0 }],
    ['web', { top: 59, left: 0, right: 0 }],
  ]) {
    const Layout = load('src/components/UserStackLayout.jsx', {
      'react-native': { Platform: { OS: platform }, View: 'View' },
      'react-native-safe-area-context': { useSafeAreaInsets: () => insets },
      '../theme/useAppTheme': { useAppTheme: () => ({ palette: { background: '#102d35' } }) },
    }).default;
    const content = h('Screen');
    const layout = Layout({ children: content });
    assert.equal(layout.props.style.paddingTop, platform === 'web' ? 0 : insets.top + 8);
    assert.equal(layout.props.style.paddingLeft, platform === 'web' ? 0 : insets.left);
    assert.equal(layout.props.style.paddingRight, platform === 'web' ? 0 : insets.right);
    assert.equal(layout.children.at(-1), content);
  }
  console.log('Startup checks passed: mobile login, all account roles, resume, logout, and saved data; light/dark app-wide status bar without conflicting iOS stack options; safe-area spacing on iOS, Android, and web.');
})().catch(error => { console.error(error); process.exitCode = 1; });
