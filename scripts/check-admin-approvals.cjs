// Exercise the real shared counts, sidebar, approval cards, and review handlers without database writes.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const React = require('react'), babel = require('@babel/core');
const root = path.resolve(__dirname, '..'), cache = new Map(), instances = new Map();
const listeners = new Set(), intervals = new Map();
let frame, effects = [], nodes = [], width = 390, dark = false, nextTimer = 0, owner = { id: 'admin', role: 'ADMIN' };
let failure = '', deferred = false, release, calls = [], failCounts = false, countRequests = 0;
const fixture = (id, extra = {}) => ({ id, name: id, municipality: 'Lingayen', approvalStatus: 'pending', submittedAt: '2026-10-05T14:00:59Z', reviewRevision: 3, description: 'Full municipal description', photo: 'https://example.test/place.jpg', ...extra });
let feed;
const initialFeed = () => ({ places: [fixture('Beach'), fixture('Park')], foods: [fixture('Bangus')], 'route-prices': [fixture('Fare', { name: undefined, from: 'Dagupan', to: 'Lingayen' })], 'transit-routes': [fixture('Bus route', { pendingDeletion: true })] });
const events = () => listeners.forEach(fn => fn());
const api = {
  async getApprovalCounts() {
    countRequests++;
    if (failCounts) throw Error('offline');
    const counts = Object.fromEntries(Object.entries(feed).map(([key, rows]) => [key, rows.filter(row => row.approvalStatus === 'pending').length]));
    return { counts, total: Object.values(counts).reduce((sum, value) => sum + value, 0) };
  },
  getApprovals: async resource => feed[resource].filter(row => row.approvalStatus === 'pending').map(row => ({ ...row })),
  async reviewSubmission(resource, id, decision, reason, revision) {
    calls.push({ resource, id, decision, reason, revision });
    if (deferred) await new Promise(resolve => { release = resolve; });
    if (failure) throw Error(failure);
    const row = feed[resource].find(row => row.id === id);
    assert.equal(revision, row.reviewRevision, 'Review uses the displayed revision');
    row.approvalStatus = decision === 'approve' ? 'approved' : 'rejected';
    events();
  },
};
const hooks = {
  createContext(value) { const context = { value }; context.Provider = context; return context; },
  useContext: context => context.value,
  useState(initial) { const owner = frame, index = frame.index++; if (!(index in owner.slots)) owner.slots[index] = typeof initial === 'function' ? initial() : initial; return [owner.slots[index], value => { owner.slots[index] = typeof value === 'function' ? value(owner.slots[index]) : value; }]; },
  useRef(value) { return hooks.useState({ current: value })[0]; },
  useCallback(callback, deps) { const index = frame.index++, previous = frame.slots[index]; if (!previous || deps.some((value, i) => value !== previous.deps[i])) frame.slots[index] = { callback, deps }; return frame.slots[index].callback; },
  useEffect(callback, deps) { const owner = frame, index = frame.index++, previous = owner.slots[index]; if (!previous || deps.some((value, i) => value !== previous.deps[i])) { effects.push(() => { previous?.cleanup?.(); owner.slots[index].cleanup = callback(); }); owner.slots[index] = { deps }; } },
};
const flatten = value => Array.isArray(value) ? Object.assign({}, ...value.filter(Boolean).map(flatten)) : value || {};
const native = { ...Object.fromEntries(['View', 'Text', 'TextInput', 'Pressable', 'ScrollView', 'Modal', 'Image', 'ActivityIndicator'].map(name => [name, name])), StyleSheet: { create: value => value, flatten, absoluteFillObject: { position: 'absolute' } }, useWindowDimensions: () => ({ width, height: 844 }), AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) } };
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const code = babel.transformSync(fs.readFileSync(file, 'utf8'), { babelrc: false, configFile: false, plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }], '@babel/plugin-transform-modules-commonjs'] }).code;
  const mod = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { console, Date, Set, Promise, AbortController, setTimeout, clearTimeout, setInterval: fn => { const id = ++nextTimer; intervals.set(id, fn); return id; }, clearInterval: id => intervals.delete(id) })(name => {
    if (name === 'react') return { ...React, ...hooks };
    if (name === 'react-native') return native;
    if (name === 'lucide-react-native') return new Proxy({}, { get: (_, key) => `Icon:${key}` });
    if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 24, bottom: 16 }) };
    if (name.endsWith('/WorkspaceMotion')) return { FeedbackPressable: 'Pressable' };
    if (name.endsWith('/lib/api')) return { api };
    if (name.endsWith('/lib/notificationEvents')) return { subscribeNotifications: fn => { listeners.add(fn); return () => listeners.delete(fn); } };
    if (name.endsWith('/store/authStore')) return { useAuthStore: selector => selector({ user: owner }) };
    if (name.endsWith('/ProfileAvatar') || name.endsWith('/SidebarLogoutButton')) return { __esModule: true, default: () => null };
    if (name.endsWith('/theme/useAppTheme')) return { useAppTheme: () => load(path.join(root, 'src/theme/theme.js')).createTheme(dark) };
    if (name.startsWith('.')) { const target = path.resolve(path.dirname(file), name); return load(fs.existsSync(target) ? target : fs.existsSync(target + '.jsx') ? target + '.jsx' : target + '.js'); }
    return require(name);
  }, mod, mod.exports);
  cache.set(file, mod.exports); return mod.exports;
}
const Provider = load(path.join(root, 'src/components/ApprovalCountsProvider.jsx')).default;
const Sidebar = load(path.join(root, 'src/components/AdminSidebar.jsx')).default;
const Approvals = load(path.join(root, 'src/pages/AdminApprovals.jsx')).default;
const Screen = () => React.createElement(Provider, {}, React.createElement(Sidebar, { compact: width < 768 }), React.createElement(Approvals));
function expand(el, location = 'root') {
  if (!el || typeof el !== 'object') return el;
  if (Array.isArray(el)) return el.map((child, i) => expand(child, `${location}/${child?.key ?? i}`));
  if (el.type?.Provider === el.type) { const previous = el.type.value; el.type.value = el.props.value; const children = expand(el.props.children, location); el.type.value = previous; return children; }
  if (typeof el.type === 'function') { const key = `${location}/${el.type.name}/${el.key || ''}`; if (!instances.has(key)) instances.set(key, { index: 0, slots: [] }); const previous = frame; frame = instances.get(key); frame.index = 0; const result = el.type(el.props); frame = previous; return expand(result, key); }
  if (el.type === React.Fragment) return expand(el.props.children, location);
  if (el.type === 'Modal' && !el.props.visible) return null;
  const result = { type: el.type, props: el.props }; nodes.push(result); result.children = expand(el.props.children, `${location}/${el.type}`); return result;
}
const render = () => { nodes = []; return expand(React.createElement(Screen)); };
const settle = async () => { await new Promise(resolve => setImmediate(resolve)); render(); };
async function drain() { for (let i = 0; i < 8; i++) { effects.splice(0).forEach(fn => fn()); await settle(); if (!effects.length) return; } throw Error('Effects did not settle'); }
const text = node => node == null || typeof node === 'boolean' ? '' : typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node.children);
const button = label => nodes.find(node => node.type === 'Pressable' && node.props.accessibilityLabel === label);
const tap = label => { const control = button(label); assert(control, label); assert(!control.props.disabled, `${label} enabled`); const result = control.props.onPress(); render(); return result; };
const hasText = value => nodes.some(node => node.type === 'Text' && text(node).includes(value));
function reset() { for (const instance of instances.values()) for (const slot of instance.slots) slot?.cleanup?.(); instances.clear(); effects = []; }
(async () => {
  for (const theme of [false, true]) for (const viewport of [320, 390, 768, 1280]) {
    dark = theme; width = viewport; feed = initialFeed(); reset(); render(); await drain();
    const menu = button('LGU approvals, 5 pending submissions'); assert(menu); assert(text(menu).endsWith('5'));
    const labelGroup = menu.children.find(node => node.type === 'View');
    assert.equal(flatten(labelGroup.props.style).flexDirection, 'row', 'Count sits directly beside the LGU approvals label');
    const badge = labelGroup.children[1];
    assert.equal(text(badge), '5');
    assert.equal(flatten(badge.props.style).backgroundColor, '#F4B183', 'Sidebar count contrasts against the dark navigation background');
    assert.equal(flatten(badge.props.style).flexShrink, 0, 'The count cannot collapse when menu labels shrink');
    for (const [label, count] of [['Places', 2], ['Local food', 1], ['Route prices', 1], ['Transit routes', 1]]) assert(button(`${label}, ${count} pending submissions`));
    const card = button('Review submission Beach'); assert(card); assert(text(card).includes('Lingayen') && text(card).includes('Submitted'));
    assert(!hasText('Full municipal description') && !button('Approve publication'), 'Overview hides full review content and actions');
    tap('Review submission Beach'); assert.equal(nodes.filter(node => node.type === 'Modal').length, 1);
    assert(hasText('Full municipal description')); assert(nodes.some(node => node.type === 'Image'));
    assert(button('Reject submission').props.disabled, 'Rejection requires a reason');
    assert.equal(flatten(button('Reject submission').props.style).backgroundColor, '#B42318', 'Reject stays red while disabled in both themes');
    assert.equal(flatten(button('Reject submission').children.props.style).color, '#FFFFFF', 'Reject label is white');
    nodes.find(node => node.props.accessibilityLabel === 'Rejection reason').props.onChangeText('Missing references'); render();
    assert(!button('Reject submission').props.disabled);
    assert.equal(flatten(button('Reject submission').props.style).backgroundColor, '#B42318', 'Enabled Reject is red');
    const scroll = nodes.find(node => node.type === 'ScrollView' && flatten(node.props.style).minHeight === 0); assert(scroll, 'Details have a bounded scroll area');
    const actionStyles = [button('Approve publication'), button('Reject submission')].map(control => flatten(control.props.style)); assert(actionStyles.every(style => style.flex === 1 && style.minHeight === 48));
    tap('Close submission details'); assert(!hasText('Full municipal description'));
  }
  calls = []; tap('Review submission Beach'); failure = 'Revision changed. Refresh the queue.';
  await tap('Approve publication'); await drain(); assert(hasText(failure)); assert(button('Close submission details')); assert(button('LGU approvals, 5 pending submissions'));
  failure = ''; deferred = true;
  const approveButton = button('Approve publication'), pending = tap('Approve publication');
  assert(button('Close submission details').props.disabled); assert(button('Reject submission').props.disabled);
  const before = calls.length; await approveButton.props.onPress(); assert.equal(calls.length, before, 'Repeated review clicks do not submit twice');
  nodes.find(node => node.type === 'Modal').props.onRequestClose(); render(); assert(button('Close submission details'), 'Busy reviews cannot close');
  release(); await pending; deferred = false; await drain();
  assert(!button('Review submission Beach')); assert(button('LGU approvals, 4 pending submissions')); assert(button('Places, 1 pending submissions'));
  assert(!nodes.some(node => node.type === 'Modal')); assert(hasText('Submission approved successfully.'));
  tap('Review submission Park'); nodes.find(node => node.props.accessibilityLabel === 'Rejection reason').props.onChangeText('Missing source information'); render();
  await tap('Reject submission'); await drain(); assert.equal(calls.at(-1).reason, 'Missing source information'); assert(button('LGU approvals, 3 pending submissions'));
  assert.equal(text(button('Places, 0 pending submissions')), 'Places', 'Zero-count category badge disappears'); assert(hasText('No pending submissions.'));
  tap('Transit routes, 1 pending submissions'); await drain(); tap('Review submission Bus route'); assert(hasText('approving permanently deletes')); await tap('Approve deletion'); await drain(); assert(button('LGU approvals, 2 pending submissions'));
  feed.foods.push(fixture('Puto')); events(); await drain(); assert(button('Local food, 2 pending submissions')); assert(button('LGU approvals, 3 pending submissions'));
  failCounts = true; intervals.forEach(fn => fn()); await drain(); assert(hasText('counts could not be refreshed')); assert(button('LGU approvals, 3 pending submissions'), 'Offline refresh preserves last known counts');
  failCounts = false; tap('Local food, 2 pending submissions'); await drain(); await tap('Refresh approval queue'); await drain(); assert(!hasText('counts could not be refreshed')); assert(button('Review submission Puto'));
  for (const resource of Object.keys(feed)) feed[resource] = [];
  events(); await drain();
  assert.equal(text(button('LGU approvals, 0 pending submissions')), 'LGU approvals0', 'Sidebar always displays the total, including a confirmed zero');
  const requests = countRequests; owner = { id: 'traveler', role: 'EXPLORER' }; feed = initialFeed(); reset(); render(); await drain(); assert.equal(countRequests, requests, 'Non-admin accounts never fetch privileged counts'); assert(button('LGU approvals, 0 pending submissions'));
  reset(); assert.equal(listeners.size, 0); assert.equal(intervals.size, 0);
  console.log('PASS: shared sidebar/category pending badges, polling and update events, hidden full reviews, clickable overview cards, scrollable dialogs, approve/reject/delete decisions, reasons/revisions, busy guards, failures/retry, zero badges, and count isolation at mobile/desktop widths in both themes.');
})().catch(error => { reset(); console.error(error); process.exitCode = 1; });
