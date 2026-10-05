// Exercise the real native screen, shared planner and platform-specific children.
// Host validation models RN's two failure modes: HTML hosts and bare text nodes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const React = require('react');
const babel = require('@babel/core');
const { renderToStaticMarkup } = require('react-dom/server');
const web = require('react-native-web');
const root = path.resolve(__dirname, '..');
const instances = new Map();
let frame, pendingEffects = [], planner, dark = false, platform = 'ios';
const navigations = [], generated = [], saved = [], shared = [];
const pdfFiles = new Map(), pdfShares = [], scrolls = [];
let failPdfWrite = false, failPdfShare = false, sharingAvailable = true, keyboardDismissals = 0;
const fileSystem = {
  Paths: { document: 'file:///documents' },
  File: class {
    constructor(parent, name) { this.uri = `${parent}/${name}`; }
    create(options) { assert.equal(options.overwrite, true); }
    write(content) { if (failPdfWrite) throw new Error('Disk full'); pdfFiles.set(this.uri, content); }
  },
};
const fileSharing = {
  isAvailableAsync: async () => sharingAvailable,
  shareAsync: async (uri, options) => {
    if (failPdfShare) throw new Error('Share failed');
    pdfShares.push({ uri, options });
  },
};
const table = { id: 'bus-matrix', mode: 'Bus', scope: 'Reference', source: 'Test matrix', rows: [{ km: 10, old: 30, regular: 40, discounted: 32 }] };
const hotel = { id: 'hotel', name: 'Test hotel', amenities: ['Wi-Fi'], lodgingDetails: { reference_rate: { min: 1500, max: 2000, period: 'night', basis: 'per room' }, overnight_supported: true, room_types: 'Double', address: 'Dagupan' } };
const catalog = { areas: [{ id: 'dagupan', lodging: [hotel], famousPlaces: ['Test attraction'], foods: ['Local food'], entries: [{ name: 'Test attraction', description: 'Verified attraction', tag: 'Attraction' }] }], fareTables: [table] };
let failGenerate = false, failSave = false;
const api = {
  getItineraryCatalog: async () => catalog,
  generateGroundedItinerary: async request => {
    generated.push(request);
    if (failGenerate) throw new Error('Planner unavailable');
    return { id: 'plan', request, stops: [{ day: 1, tag: 'Attraction', title: 'Test attraction', time: '08:00', subtitle: 'Visit the attraction.', price: 100 }], warnings: ['Confirm opening times'], costEstimate: { meals: 300, transport: [{ mode: 'Bus', perRide: 40, rides: 2, total: 80 }], transportTotal: 80 }, foodOptions: [{ id: 'food', name: 'Local food', description: 'Local specialty', where: 'Market', listedAveragePrice: 100 }] };
  },
  saveItinerary: async id => { if (failSave) throw new Error('Save unavailable'); saved.push(id); },
};
const hooks = {
  ...React,
  useState(initial) {
    const instance = frame, index = instance.index++;
    if (!(index in instance.slots)) instance.slots[index] = typeof initial === 'function' ? initial() : initial;
    return [instance.slots[index], value => { instance.slots[index] = typeof value === 'function' ? value(instance.slots[index]) : value; }];
  },
  useRef(initial) {
    const instance = frame, index = instance.index++;
    if (!(index in instance.slots)) instance.slots[index] = { current: initial };
    return instance.slots[index];
  },
  useEffect(callback, deps) {
    const instance = frame, index = instance.index++;
    if (!instance.slots[index] || deps.some((value, i) => value !== instance.slots[index].deps[i])) {
      instance.slots[index]?.cleanup?.();
      const slot = { deps }; instance.slots[index] = slot;
      pendingEffects.push(() => { slot.cleanup = callback(); });
    }
  },
};
const host = name => props => {
  if (name === 'ScrollView' && props.ref) props.ref.current = { scrollTo: options => scrolls.push(options) };
  return name === 'Modal' && !props.visible ? null : React.createElement(`native:${name}`, props, props.children);
};
const native = Object.fromEntries(['View', 'Text', 'TextInput', 'ScrollView', 'KeyboardAvoidingView', 'ActivityIndicator', 'Image', 'Pressable', 'Modal'].map(name => [name, host(name)]));
const modalInsets = { top: 59, bottom: 34, left: 0, right: 0 };
Object.assign(native, { useWindowDimensions: () => ({ width: 393, height: 852 }), Platform: { get OS() { return platform; } }, Keyboard: { dismiss: () => { keyboardDismissals++; } }, Share: { share: async value => shared.push(value) }, StyleSheet: { create: value => value, absoluteFillObject: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 } } });
function makeLoader(webMode = false) {
  const cache = new Map();
  const icons = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    if (/\.(png|jpg)$/.test(file)) return 1;
    const module = { exports: {} }; cache.set(file, module);
    const code = babel.transformSync(fs.readFileSync(file, 'utf8'), { filename: file, configFile: false, babelrc: false, plugins: [...(file.endsWith('.ts') ? ['@babel/plugin-transform-typescript'] : []), ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }], '@babel/plugin-transform-modules-commonjs'] }).code;
    function imports(name) {
      if (name === 'react') return webMode ? React : hooks;
      if (name === 'react-native') return webMode ? web : native;
      // Reproduce a presenting screen/initial native modal measurement that
      // reports zero insets. The window's camera/home-indicator space must hold.
      if (name === 'react-native-safe-area-context') return { SafeAreaView: native.View, SafeAreaProvider: host('SafeAreaProvider'), initialWindowMetrics: { insets: modalInsets }, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
      if (name === 'lucide-react-native') return new Proxy({}, { get: (_, key) => {
        if (!icons.has(key)) icons.set(key, props => webMode ? null : React.createElement(native.View, { ...props, iconName: key }));
        return icons.get(key);
      } });
      if (name === 'expo-file-system') return fileSystem;
      if (name === 'expo-sharing') return fileSharing;
      if (name.endsWith('/lib/api')) return { api };
      if (name.endsWith('/theme/useAppTheme')) return { useAppTheme: () => load(path.join(root, 'src/theme/theme.js')).createTheme(dark) };
      if (name.endsWith('/hooks/useItineraryPlanner')) {
        const actual = load(path.join(root, 'src/hooks/useItineraryPlanner.js'));
        return { ...actual, useItineraryPlanner: options => webMode ? planner : (planner = actual.useItineraryPlanner(options)) };
      }
      if (name.startsWith('.')) {
        const target = path.resolve(path.dirname(file), name);
        const extensions = webMode ? ['.web.jsx', '.web.js', '.jsx', '.js', '.ts'] : ['.native.jsx', '.native.js', '.jsx', '.js', '.ts'];
        const resolved = fs.existsSync(target) ? target : extensions.map(ext => target + ext).find(candidate => fs.existsSync(candidate));
        assert.ok(resolved, `Resolve ${name} from ${file}`);
        return load(resolved);
      }
      return require(name);
    }
    vm.runInThisContext(`(function(require,module,exports,requestAnimationFrame,cancelAnimationFrame){${code}\n})`, { filename: file })(imports, module, module.exports, callback => { callback(); return 1; }, () => {});
    return module.exports;
  }
  return load;
}
const load = makeLoader();
const Screen = load(path.join(root, 'src/pages/AIItinerary.native.jsx')).default;
const loaded = [];
function expand(element, location = 'root', insideText = false) {
  if (element == null || typeof element === 'boolean') return;
  if (typeof element === 'string' || typeof element === 'number') {
    assert.ok(insideText || element === '', `Bare text outside Text at ${location}: ${element}`); return;
  }
  if (Array.isArray(element)) return element.forEach((child, index) => expand(child, `${location}/${child?.key ?? index}`, insideText));
  if (typeof element.type === 'function') {
    const key = `${location}/${element.type.name}`;
    if (!instances.has(key)) instances.set(key, { slots: [], index: 0 });
    const previous = frame; frame = instances.get(key); frame.index = 0;
    const child = element.type(element.props); frame = previous;
    return expand(child, key, insideText);
  }
  if (element.type === React.Fragment) return expand(element.props.children, location, insideText);
  assert.match(element.type, /^native:/, `Unsupported native host ${element.type}`);
  loaded.push(element);
  expand(element.props.children, location, insideText || element.type === 'native:Text');
}
const render = () => { loaded.length = 0; expand(React.createElement(Screen, { navigation: { navigate: (...args) => navigations.push(args) } })); };
const flush = async () => { const effects = pendingEffects; pendingEffects = []; effects.forEach(effect => effect()); await new Promise(resolve => setImmediate(resolve)); render(); };
const tap = label => {
  const button = buttonFor(label);
  assert.ok(button, `Find button: ${label}`); button.props.onPress(); render();
};
const buttonFor = label => loaded.find(element => element.type === 'native:Pressable' && (element.props.accessibilityLabel === label || textOf(element.props.children) === label));
const assertIcon = label => {
  const button = buttonFor(label);
  assert(button, label);
  assert(React.Children.toArray(button.props.children).some(child => typeof child?.type === 'function' && child.props.size === 18), `${label} must render its icon`);
};
function validatePdf(pdf) {
  assert(pdf.startsWith('%PDF-1.4\n'));
  assert(pdf.endsWith('%%EOF'));
  assert(!/[^\x00-\x7f]/.test(pdf), 'PDF offsets must count actual ASCII bytes');
  const xref = Number(pdf.match(/startxref\n(\d+)/)[1]);
  assert.equal(pdf.slice(xref, xref + 4), 'xref');
  const offsets = pdf.slice(xref).matchAll(/^(\d{10}) 00000 n $/gm);
  let id = 1;
  for (const [, offset] of offsets) assert(pdf.slice(Number(offset)).startsWith(`${id++} 0 obj\n`));
  for (const [, length, stream] of pdf.matchAll(/\/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/g)) assert.equal(Buffer.byteLength(stream), Number(length));
}
function textOf(element) {
  if (element == null || typeof element === 'boolean') return '';
  if (typeof element === 'string' || typeof element === 'number') return String(element);
  if (Array.isArray(element)) return element.map(textOf).join('');
  return textOf(element.props.children);
}
const webScreen = makeLoader(true)(path.join(root, 'src/pages/AIItinerary.jsx')).default;
const webRender = expected => assert.ok(renderToStaticMarkup(React.createElement(webScreen, { navigation: { navigate() {} } })).includes(expected));

(async () => {
  try {
    render(); await flush(); assert.equal(planner.catalog.length, 1);
    for (const label of ['Nature', 'Photography', 'Solo', 'Balanced · Mix of rest & activity', 'Next: trip details']) assertIcon(label);
    planner.goNext(); render(); assert.equal(planner.step, 1); assert.ok(planner.fieldErrors.areaId);
    // Native searchable modal and selection work without document/window APIs.
    const checkFirstOpen = () => {
      const modal = loaded.find(element => element.type === 'native:Modal');
      assert(modal.props.transparent, 'Selection must use a compact panel instead of an empty fullscreen page');
      const provider = loaded.find(element => element.type === 'native:SafeAreaProvider');
      assert.equal(provider.props.initialMetrics.insets.top, 59, 'Insets must be present before the first native layout event');
      const insetView = loaded.find(element => element.props.style?.paddingTop === 75);
      assert(insetView, 'First-open content must clear the camera and status bar');
      assert.equal(insetView.props.style.paddingBottom, 50, 'Content must clear the home indicator');
    };
    tap('Where in Pangasinan?'); checkFirstOpen(); tap('Dagupan City'); assert.equal(planner.form.areaId, 'dagupan');
    tap('Where in Pangasinan?'); checkFirstOpen(); tap('Close');
    planner.set('tripTypes', ['Nature']); render(); planner.set('activities', ['Photography']); render();
    planner.set('travelerType', 'solo'); render(); planner.set('travelStyle', 'balanced'); render();
    webRender('Choose your destination'); planner.goNext(); render(); assert.equal(planner.step, 2);
    webRender('Trip details');
    planner.chooseBudget(planner.selectedBudget || load(path.join(root, 'src/hooks/useItineraryPlanner.js')).BUDGET_PACKAGES[0]); render();
    assert.equal(planner.form.budget, '500'); planner.set('days', 2); render(); assert.equal(planner.form.budget, '1000');
    planner.set('lodgingId', 'hotel'); render(); planner.goNext(); render(); assert.equal(planner.step, 2); assert.ok(planner.fieldErrors.lodgingId);
    planner.set('lodgingId', null); render(); planner.set('days', 1); render(); planner.goNext(); render(); assert.equal(planner.step, 3);
    planner.set('transportModes', ['Bus', 'Tricycle', 'Van', 'Own Vehicle']); render();
    assert.equal(planner.form.fareInputs.find(item => item.mode === 'Bus').tableId, 'bus-matrix');
    tap('Bus fare matrix'); checkFirstOpen(); tap('Close');
    planner.set('fareInputs', [{ mode: 'Bus', tableId: table.id, km: 10, rides: 2 }, { mode: 'Tricycle', allowance: 20, rides: 2 }, { mode: 'Van', allowance: 100, rides: 2 }, { mode: 'Own Vehicle', allowance: 50, rides: 1 }]); render();
    webRender('Review and personalize');
    // Also render alternate device/theme, error fields and hidden advanced options.
    dark = true; platform = 'android'; render(); planner.setShowAdvanced(false); render(); planner.setShowAdvanced(true); render();
    planner.set('transportModes', ['Bus']); render();
    planner.set('date', '2020-01-01'); render(); await planner.generate(); render(); assert.equal(generated.length, 0); assert.equal(planner.step, 2);
    planner.set('date', load(path.join(root, 'src/hooks/useItineraryPlanner.js')).todayInManila()); render(); planner.goNext(); render();
    const beforeResults = scrolls.length;
    failGenerate = true; await planner.generate(); render(); await flush(); assert.equal(planner.error, 'Planner unavailable'); assert.equal(planner.phase, '');
    assert.equal(scrolls.length, beforeResults, 'Failed generation must retain the review position');
    failGenerate = false; await planner.generate(); render(); await flush(); assert.equal(planner.showForm, false); assert.ok(planner.plan);
    assert.deepEqual(scrolls.at(-1), { y: 0, animated: false });
    assert.equal(keyboardDismissals, 1, 'Result display dismisses the keyboard');
    assert.equal(generated.at(-1).travelers, 1); assert.equal(typeof generated.at(-1).budget, 'number');
    webRender('YOUR TRIP PLAN');
    for (const label of ['Edit trip', 'Download PDF', 'Share itinerary', 'Save plan']) assertIcon(label);
    const notesIndex = loaded.findIndex(element => element.type === 'native:Text' && textOf(element) === 'Plan notes');
    assert(notesIndex >= 0);
    assert(loaded.indexOf(buttonFor('Save plan')) > notesIndex, 'Save must follow plan notes');
    assert.equal(loaded.filter(element => element.type === 'native:Pressable').at(-1), buttonFor('Save plan'), 'Save must be the last result action');
    for (const device of ['ios', 'android']) {
      platform = device; render();
      const exportButton = buttonFor('Download PDF');
      const before = pdfShares.length;
      const exporting = exportButton.props.onPress();
      await exportButton.props.onPress();
      render();
      assert(buttonFor('Preparing PDF…').props.disabled);
      await exporting; render();
      assert.equal(pdfShares.length, before + 1, 'Duplicate taps must not open multiple dialogs');
      const { uri, options } = pdfShares.at(-1);
      assert(uri.startsWith('file:///documents/') && uri.endsWith('.pdf'));
      assert.equal(options.mimeType, 'application/pdf'); assert.equal(options.UTI, 'com.adobe.pdf');
      const pdf = pdfFiles.get(uri); validatePdf(pdf);
      for (const copy of ['Test attraction', 'PLAN NOTES', 'Confirm opening times', 'COST BREAKDOWN', 'Local food']) assert(pdf.includes(copy));
      assert(buttonFor('Download PDF') && !buttonFor('Download PDF').props.disabled);
    }
    for (const failure of ['write', 'share', 'unavailable']) {
      failPdfWrite = failure === 'write'; failPdfShare = failure === 'share'; sharingAvailable = failure !== 'unavailable';
      const before = pdfShares.length;
      await buttonFor('Download PDF').props.onPress(); render();
      assert.equal(pdfShares.length, before);
      assert(loaded.some(element => element.type === 'native:Text' && element.props.accessibilityRole === 'alert' && textOf(element).includes('PDF could not')));
      assert(!buttonFor('Download PDF').props.disabled, 'Export can be retried after failure');
    }
    failPdfWrite = false; failPdfShare = false; sharingAvailable = true;
    // Both platforms share the browser's PDF writer, including multi-page notes.
    const longPlan = { ...planner.plan, costEstimate: load(path.join(root, 'src/lib/itinerarySummary.js')).itinerarySummary(planner.plan, planner.fareTables), warnings: Array.from({ length: 130 }, (_, i) => `Note ${i}: Confirm opening times and transport availability before travel.`) };
    const document = load(path.join(root, 'src/lib/itineraryPdfDocument.js')).itineraryPdfDocument(longPlan, 'Dagupan');
    validatePdf(document); assert(Number(document.match(/\/Count (\d+)/)[1]) > 1); assert(document.includes('Note 129'));
    const blob = makeLoader(true)(path.join(root, 'src/lib/itineraryPdf.js')).itineraryPdf(longPlan, 'Dagupan');
    assert.equal(blob.type, 'application/pdf'); assert.equal(await blob.text(), document);
    const shareButton = loaded.find(element => element.type === 'native:Pressable' && textOf(element.props.children) === 'Share itinerary');
    await shareButton.props.onPress(); assert.equal(shared.length, 1); assert.ok(shared[0].message.includes('Test attraction'));
    failSave = true; await planner.savePlan(); render(); assert.equal(planner.error, 'Save unavailable');
    assert.equal(navigations.length, 0, 'Failed save must not show a success confirmation');
    failSave = false; await planner.savePlan(); render(); assert.deepEqual(saved, ['plan']); assert.equal(navigations[0][0], 'MyTrips');
    assert.equal(navigations[0][1].successMessage, 'Itinerary Plan has successfully saved to "My Trips"');
    tap('Edit trip'); assert.equal(planner.showForm, true);
    await flush(); await planner.generate(); render(); await flush();
    assert.equal(keyboardDismissals, 2, 'Regeneration must also open at the top');
    assert.deepEqual(scrolls.at(-1), { y: 0, animated: false });
    tap('Edit trip');
    // A destination change must clear lodging and stale fares.
    planner.set('areaId', 'alaminos'); render(); assert.equal(planner.form.lodgingId, ''); assert.equal(planner.form.fareInputs.length, 0);
    console.log('PASS: native planner icons and hosts; generated/regenerated results scroll to top; Save follows plan notes; iOS/Android PDF files, metadata, duplicate taps, failures and retry; multi-page PDFs match web output; validation, budgets, sharing and saving.');
  } finally {
    for (const instance of instances.values()) for (const slot of instance.slots) slot?.cleanup?.();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
