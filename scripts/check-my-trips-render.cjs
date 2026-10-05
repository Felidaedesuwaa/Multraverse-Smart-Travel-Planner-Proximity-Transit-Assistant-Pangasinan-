// Exercise trip details and their confirmations through the real component tree.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const React = require('react');
const babel = require('@babel/core');

const root = path.resolve(__dirname, '..');
const cache = new Map(), instances = new Map();
let frame, effects = [], nodes = [], width = 390, dark = false;
let pdfCalls = 0, failPdf = false, failUpdate = false, releaseUpdate;
const plan = {
  id: 'plan',
  request: { areaId: 'dagupan', date: '2026-10-05', days: 1, travelers: 1, budget: 2000, mealBudget: 200, startTime: '08:00', transportModes: [] },
  stops: [{ day: 1, tag: 'Attraction', time: '09:00', title: 'Nature stop', price: 0 }],
};
const trips = ['UPCOMING', 'COMPLETED', 'CANCELED'].map((status, i) => ({
  id: String(i), title: `${status} itinerary`, location: 'Pangasinan', date: '2026-10-05',
  budget: 2000, spent: 0, stops: 1, status, plan: { guided: plan },
}));
let deleted = [];
const api = {
  getTrips: async () => trips.map(t => ({ ...t })),
  getItineraryCatalog: async () => ({ areas: [], fareTables: [] }),
  deleteTrip: async id => { deleted.push(id); },
  updateTrip: async (id, update) => {
    if (failUpdate) throw new Error('Connection lost. Try again.');
    await new Promise(resolve => { releaseUpdate = resolve; });
    return { ...trips.find(t => t.id === id), ...update };
  },
};
const hooks = {
  useState(initial) {
    const owner = frame, index = frame.index++;
    if (!(index in owner.slots)) owner.slots[index] = typeof initial === 'function' ? initial() : initial;
    return [owner.slots[index], value => { owner.slots[index] = typeof value === 'function' ? value(owner.slots[index]) : value; }];
  },
  useEffect(callback, deps) {
    const index = frame.index++;
    const previous = frame.slots[index];
    if (!previous || !deps || deps.some((value, i) => value !== previous[i])) effects.push(callback);
    frame.slots[index] = deps;
  },
  useCallback(callback, deps) {
    const index = frame.index++, previous = frame.slots[index];
    if (!previous || deps.some((value, i) => value !== previous.deps[i])) frame.slots[index] = { callback, deps };
    return frame.slots[index].callback;
  },
};
const flatten = style => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean).map(flatten)) : style || {};
const native = {
  ...Object.fromEntries(['View', 'Text', 'TextInput', 'Pressable', 'ScrollView', 'ActivityIndicator', 'Modal'].map(name => [name, name])),
  StyleSheet: { create: value => value, flatten, absoluteFillObject: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 } },
  useWindowDimensions: () => ({ width, height: 844 }),
};
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const code = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file, configFile: false, babelrc: false,
    plugins: [...(file.endsWith('.ts') ? ['@babel/plugin-transform-typescript'] : []), ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }], '@babel/plugin-transform-modules-commonjs'],
  }).code;
  const module = { exports: {} };
  function imports(name) {
    if (name === 'react') return { ...React, ...hooks };
    if (name === 'react-native') return native;
    if (name === 'lucide-react-native') return new Proxy({}, { get: (_, key) => `Icon:${key}` });
    if (name === '@react-navigation/native') return { useFocusEffect: callback => hooks.useEffect(callback, [callback]) };
    if (name.endsWith('/WorkspaceMotion')) return { FeedbackPressable: 'Pressable' };
    if (name.endsWith('/lib/api')) return { api };
    if (name.endsWith('/lib/itineraryPdf')) return { downloadItineraryPdf: async () => {
      pdfCalls++;
      if (failPdf) throw new Error('Share failed');
    } };
    if (name.endsWith('/store/preferencesStore')) return { usePreferencesStore: selector => selector({ currency: 'PHP', rates: { PHP: 1 } }) };
    if (name.endsWith('/theme/useAppTheme')) return { useAppTheme: () => load(path.join(root, 'src/theme/theme.js')).createTheme(dark) };
    if (name.startsWith('.')) {
      const target = path.resolve(path.dirname(file), name);
      return load(fs.existsSync(target) ? target : ['.jsx', '.js', '.ts'].map(ext => target + ext).find(fs.existsSync));
    }
    return require(name);
  }
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(imports, module, module.exports);
  cache.set(file, module.exports);
  return module.exports;
}
const Screen = load(path.join(root, 'src/pages/MyTrips.jsx')).default;
function expand(element, location = 'root') {
  if (!element || typeof element !== 'object') return element;
  if (Array.isArray(element)) return element.map((child, i) => expand(child, `${location}/${child?.key ?? i}`));
  if (typeof element.type === 'function') {
    const key = `${location}/${element.type.name}`;
    if (!instances.has(key)) instances.set(key, { index: 0, slots: [] });
    const previous = frame; frame = instances.get(key); frame.index = 0;
    const child = element.type(element.props); frame = previous;
    return expand(child, key);
  }
  if (element.type === React.Fragment) return expand(element.props.children, location);
  if (element.type === 'Modal' && !element.props.visible) return null;
  const result = { type: element.type, props: element.props };
  nodes.push(result);
  result.children = expand(element.props.children, `${location}/${element.type}`);
  return result;
}
function render() {
  nodes = [];
  return expand(React.createElement(Screen, { navigation: { setParams() {} } }));
}
const settle = async () => { await new Promise(resolve => setImmediate(resolve)); render(); };
async function flush() { for (const effect of effects.splice(0)) effect(); await settle(); }
function textOf(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return textOf(node.children);
}
const button = label => nodes.findLast(n => n.type === 'Pressable' && (n.props.accessibilityLabel === label || textOf(n) === label));
function tap(label) { const found = button(label); assert(found, `Find button ${label}`); assert(!found.props.disabled, `${label} is enabled`); const promise = found.props.onPress(); render(); return promise; }
const modalCount = () => nodes.filter(n => n.type === 'Modal').length;
const open = () => tap('Open trip details for UPCOMING itinerary');
const hasText = value => nodes.some(n => n.type === 'Text' && textOf(n).includes(value));

(async () => {
  for (const theme of [false, true]) for (const viewport of [320, 390, 768, 1280]) {
    dark = theme; width = viewport; instances.clear(); effects = []; render(); await flush();
    const tabs = nodes.find(n => n.type === 'ScrollView' && n.props.horizontal);
    assert(tabs, 'Categories stay in a horizontal scroll row at every width');
    assert.equal(flatten(tabs.props.contentContainerStyle).flexDirection, 'row');
    assert.notEqual(flatten(tabs.props.contentContainerStyle).flexWrap, 'wrap');
    assert.equal(button('Upcoming, 1 trips').props.accessibilityState.selected, false);
    assert.equal(flatten(button('Upcoming, 1 trips').props.style).backgroundColor, 'transparent');
    assert.equal(flatten(button('Upcoming, 1 trips').props.style).borderWidth, 0);
    tap('Completed, 1 trips');
    assert.equal(button('Completed, 1 trips').props.accessibilityState.selected, true);
    assert(button('Open trip details for COMPLETED itinerary'));
    assert(!button('Open trip details for UPCOMING itinerary'));
    tap('All, 3 trips');
    assert(!button('View') && !button('Delete Trip'), 'List cards only offer the chevron');
    assert(!nodes.some(n => n.type === 'Icon:Trash2'), 'There is no trash icon in the list');
    const input = nodes.find(n => n.type === 'TextInput');
    input.props.onChangeText('completed'); render();
    assert(button('Open trip details for COMPLETED itinerary') && !button('Open trip details for UPCOMING itinerary'));
    nodes.find(n => n.type === 'TextInput').props.onChangeText(''); render();
    open(); await flush(); assert.equal(modalCount(), 1);
    assert(!button('Delete Trip'), 'Active trips cannot be deleted');
    const scroll = nodes.findLast(n => n.type === 'ScrollView' && flatten(n.props.style).minHeight === 0);
    assert.equal(flatten(scroll.props.style).flex, 1, 'Details have a bounded scroll area');
    for (const action of ['Cancel Trip', 'Complete Trip']) {
      tap(action); assert.equal(modalCount(), 1, `${action} uses the existing details modal`);
      tap('Go back'); assert.equal(modalCount(), 1);
    }
    tap('Done'); assert.equal(modalCount(), 0, 'Closing details dismisses immediately');
    assert(!hasText('Trip details closed'), 'Closing has no feedback banner');
    open(); tap('Close trip information'); assert.equal(modalCount(), 0, 'Header close dismisses immediately');
  }
  open(); await flush();
  tap('Export PDF'); assert.equal(modalCount(), 1, 'PDF confirmation does not present a sibling modal');
  await tap('Export PDF'); await settle(); assert.equal(pdfCalls, 1); assert(hasText('PDF is ready'));
  failPdf = true; tap('Export PDF'); await tap('Export PDF'); await settle();
  assert(hasText('PDF could not be downloaded'), 'Asynchronous sharing failures remain visible and retryable');
  failPdf = false;
  tap('Complete Trip'); const pending = tap('Complete Trip');
  assert.equal(modalCount(), 1); assert(button('Working...').props.disabled);
  assert(button('Go back').props.disabled, 'Busy confirmations cannot be dismissed');
  releaseUpdate(); await pending; await settle(); assert(hasText('Trip marked as completed successfully'));
  tap('Done');
  tap('Open trip details for CANCELED itinerary');
  tap('Delete Trip'); await tap('Delete Trip'); await settle();
  assert.deepEqual(deleted, ['2']); assert.equal(modalCount(), 0);
  tap('Open trip details for COMPLETED itinerary'); assert(button('Delete Trip')); tap('Done');
  // Reload an upcoming trip to verify update errors leave details usable.
  instances.clear(); render(); await flush(); tap('Open trip details for UPCOMING itinerary');
  failUpdate = true; tap('Cancel Trip'); await tap('Cancel Trip'); await settle();
  assert(hasText('Connection lost. Try again.')); assert.equal(modalCount(), 1);
  tap('Done'); assert.equal(modalCount(), 0);
  console.log('PASS: My Trips filters/search at mobile and desktop widths in both themes; chevron-only cards; single-modal trip actions, close/reopen, PDF success/failure, busy guards, updates/deletion and API failure recovery.');
})().catch(error => { console.error(error); process.exitCode = 1; });
