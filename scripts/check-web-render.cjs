// Exercise the affected components with the installed web View and SVG implementations.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Module = require('node:module');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { transformSync } = require('@babel/core');
const web = require('react-native-web');
const svgProps = [];
const native = {
  ...web,
  Platform: { ...web.Platform, OS: 'web' },
  unstable_createElement: (tag, props) => {
    svgProps.push({ tag, props });
    return web.unstable_createElement(tag, props);
  },
};
// SVG's CommonJS web entry still imports react-native internally.
const originalLoad = Module._load;
let svg;
try {
  Module._load = function (name, ...args) {
    return name === 'react-native' ? native : originalLoad.call(this, name, ...args);
  };
  svg = require('react-native-svg/lib/commonjs/elements.web.js');
} finally {
  Module._load = originalLoad;
}

let translation = '';
let translatorStateIndex = 0;
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const result = { exports: {} };
  const { code } = transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file, configFile: false, babelrc: false,
    plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }], '@babel/plugin-transform-modules-commonjs'],
  });
  function imports(name) {
    if (name === 'react') return {
      ...React,
      useState: initial => {
        const [value, setter] = React.useState(initial);
        const outputState = file.endsWith('Translator.jsx') && translatorStateIndex++ === 3;
        return [outputState ? translation : value, setter];
      },
    };
    if (name === 'react-native') return native;
    if (name === 'react-native-svg') return svg;
    if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
    if (name === '@react-navigation/native') return { useNavigation: () => ({ navigate() {} }), useIsFocused: () => true };
    if (name === 'lucide-react-native') return new Proxy({}, { get: () => () => null });
    if (name.endsWith('/theme/useAppTheme')) return { useAppTheme: () => load(path.resolve(__dirname, '../src/theme/theme.js')).createTheme(false) };
    if (name.endsWith('/hooks/useMapPlaces')) return { useMapPlaces: () => ({ places: [] }) };
    if (name.endsWith('/lib/api')) return { api: {} };
    if (/Map(Place|Hover)Preview$/.test(name)) return { __esModule: true, default: () => null };
    if (name.startsWith('.')) {
      const target = path.resolve(path.dirname(file), name);
      if (target.endsWith('.json')) return require(target);
      return load(fs.existsSync(target) ? target : fs.existsSync(target + '.jsx') ? target + '.jsx' : target + '.js');
    }
    return require(name);
  }
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(imports, result, result.exports);
  cache.set(file, result.exports);
  return result.exports;
}

const errors = [];
const originalError = console.error;
console.error = (...args) => errors.push(args.join(' '));
try {
  const Translator = load(path.resolve(__dirname, '../src/pages/Translator.jsx')).default;
  const empty = renderToStaticMarkup(React.createElement(Translator));
  assert.ok(empty.includes('Your translation will appear here...'));
  translation = 'Maabig ya agew';
  translatorStateIndex = 0;
  const translated = renderToStaticMarkup(React.createElement(Translator));
  assert.ok(translated.includes(translation));
  assert.ok(!translated.includes('Your translation will appear here...'));
  assert.deepEqual(errors, [], 'Translator must render empty and populated output without text-node errors');

  const Map = load(path.resolve(__dirname, '../src/components/PangasinanMap.jsx')).default;
  const toggled = [];
  const html = renderToStaticMarkup(React.createElement(Map, { mode: 'select', onToggle: id => toggled.push(id) }));
  assert.ok(html.includes('Lingayen Gulf'));
  const areas = svgProps.filter(({ props }) => props.testID?.startsWith('map-area-'));
  assert.equal(areas.length, 48);
  for (const { props } of areas) {
    assert.equal(typeof props.onClick, 'function', 'Web map areas must remain clickable');
    assert.ok(!Object.keys(props).some(key => /^onResponder|^onStartShouldSetResponder/.test(key)), 'SVG must not forward native responder handlers to the DOM');
  }
  areas[0].props.onClick();
  assert.deepEqual(toggled, [areas[0].props.testID.slice('map-area-'.length)]);
  assert.deepEqual(errors, [], 'Map must render without console errors');
  console.log('PASS: empty/populated translator output; 48 real web SVG areas; no leaked responder handlers; map selection works.');
} finally {
  console.error = originalError;
}
