// Exercise the real feedback component and provider tree without API writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { transformSync } = require('@babel/core');

let reduced = false;
let dark = false;
let captured;
const platform = { OS: 'web' };
const flatten = style => Array.isArray(style)
  ? Object.assign({}, ...style.filter(Boolean).map(flatten)) : style || {};
const file = path.resolve(__dirname, '../src/components/WorkspaceMotion.jsx');
const { code } = transformSync(fs.readFileSync(file, 'utf8'), {
  filename: file, babelrc: false, configFile: false,
  plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }], '@babel/plugin-transform-modules-commonjs'],
});
const result = { exports: {} };
function imports(name) {
  if (name === 'react') return {
    ...React,
    useState: initial => React.useState(initial === true ? reduced : initial),
  };
  if (name === 'react-native') return {
    Platform: platform, StyleSheet: { flatten, create: style => style },
    Pressable: props => { captured = props; return React.createElement('button'); },
    View: props => { captured = props; return React.createElement('div', null, props.children); },
  };
  if (name === '@react-navigation/native') return {};
  if (name.endsWith('/theme/useAppTheme')) return { useAppTheme: () => ({ palette: { button: '#F4B183' }, isDark: dark, themeStyle: style => style }) };
  if (name.endsWith('/theme/colors')) return { colors: { white: '#fff', border: '#ddd', oceanBlue: '#123F52' } };
  return require(name);
}
vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(imports, result, result.exports);
const { FeedbackPressable, WorkspaceMotionProvider, UserInteractionProvider } = result.exports;
function render(props, user = true) {
  const button = React.createElement(FeedbackPressable, props);
  renderToStaticMarkup(React.createElement(WorkspaceMotionProvider, null,
    user ? React.createElement(UserInteractionProvider, null, button) : button));
  return captured;
}
const onPress = () => {};
const base = { opacity: 0.7, transform: [{ rotate: '4deg' }] };
const idle = { hovered: false, pressed: false };
const hover = { hovered: true, pressed: false };
const press = { hovered: true, pressed: true };
let props = render({ onPress, style: base });
const hovered = flatten(props.style(hover));
assert.ok(hovered.transform.some(value => value.translateY < 0), 'User buttons lift on hover');
assert.ok(hovered.transform.some(value => value.scale > 1), 'User hover gives a gentle expansion');
assert.equal(hovered.transform[0].rotate, '4deg', 'Existing transforms survive');
assert.equal(hovered.opacity, 0.7 * 0.96, 'Feedback preserves existing opacity');
assert.ok(parseInt(hovered.transitionDuration, 10) > 0, 'Web hover animates');
assert.ok(flatten(props.style(press)).transform.some(value => value.scale < 1), 'Press gives tactile feedback');
assert.ok(flatten(props.style(idle)).transform.some(value => value.translateY === 0), 'Hover exit resets position');
assert.equal(props.onPress, onPress);
assert.equal(hovered.outlineStyle, 'none', 'Pointer hover does not draw an outline');
props = render({ accessibilityRole: 'button', style: base });
assert.ok(flatten(props.style(hover)).transform.some(value => value.translateY < 0), 'Sync All button animates without changing its action');
props = render({ accessibilityRole: 'link', onPress, style: base });
assert.deepEqual(flatten(props.style(hover)).transform, base.transform, 'Links do not inherit button hover movement');
assert.equal(flatten(props.style(hover)).opacity, base.opacity, 'Links stay visually still on hover');

const filled = { backgroundColor: '#8F4549' };
props = render({ onPress, style: filled });
const lightShadow = flatten(props.style(hover)).boxShadow;
assert.ok(lightShadow, 'Filled user buttons have a soft hover shadow');
assert.equal(flatten(props.style(idle)).boxShadow, undefined, 'Hover exit clears the shadow');
dark = true;
props = render({ onPress, style: filled });
assert.notEqual(flatten(props.style(hover)).boxShadow, lightShadow, 'Shadow adapts to the color mode');
dark = false;
props = render({ onPress, style: { ...filled, boxShadow: '0 1px 3px black' } });
assert.equal(flatten(props.style(hover)).boxShadow, '0 1px 3px black', 'Custom shadows are preserved');
props = render({ onPress, style: filled, disabled: true });
assert.deepEqual(flatten(props.style(hover)), filled, 'Disabled filled buttons do not get hover effects');

props = render({ onPress, style: base, disabled: true });
assert.deepEqual(flatten(props.style(hover)), base, 'Disabled buttons keep their appearance');
assert.equal(props.disabled, true);
props = render({ style: base });
assert.deepEqual(flatten(props.style(hover)), base, 'Non-interactive controls stay still');
props = render({ onPress, style: base }, false);
assert.deepEqual(flatten(props.style(hover)).transform, base.transform, 'Other workspaces do not inherit user movement');
props = render({ onPress, style: base, lift: false });
assert.deepEqual(flatten(props.style(hover)).transform, base.transform, 'Explicit opt-out works');

reduced = true;
props = render({ onPress, style: base });
assert.deepEqual(flatten(props.style(hover)).transform, base.transform, 'Reduced motion removes hover movement');
assert.deepEqual(flatten(props.style(press)).transform, base.transform, 'Reduced motion removes press movement');
assert.equal(flatten(props.style(hover)).transitionDuration, '0ms');
props = render({ onPress, style: filled });
assert.equal(flatten(props.style(hover)).boxShadow, undefined, 'Reduced motion keeps hover shadows still');
reduced = false;

let styleState;
let focusEvent;
let blurEvent;
const onHoverIn = () => {};
const children = state => state.pressed ? 'Pressed' : 'Idle';
const ref = { current: null };
props = render({ onPress, ref, children, onHoverIn,
  style: state => { styleState = state; return base; },
  onFocus: event => { focusEvent = event; }, onBlur: event => { blurEvent = event; },
});
props.style(press);
assert.equal(styleState, press, 'Style callbacks receive the interaction state');
assert.equal(props.children, children, 'Render callbacks are preserved');
assert.equal(props.ref, ref, 'Dialog focus refs reach the native Pressable');
assert.equal(props.onHoverIn, onHoverIn, 'Map hover handlers are preserved');
const event = { currentTarget: { matches: () => true } };
props.onFocus(event); props.onBlur(event);
assert.equal(focusEvent, event); assert.equal(blurEvent, event);
platform.OS = 'android';
props = render({ onPress, style: base });
const native = flatten(props.style(press));
assert.equal(native.transitionDuration, undefined, 'CSS stays off native controls');
props = render({ onPress, style: filled });
assert.equal(flatten(props.style(hover)).boxShadow, undefined, 'Web hover shadows stay off native controls');
assert.ok(native.transform.some(value => value.scale < 1), 'Native buttons retain press feedback');

const cardFile = path.resolve(__dirname, '../src/components/Card.jsx');
const cardCode = transformSync(fs.readFileSync(cardFile, 'utf8'), {
  filename: cardFile, babelrc: false, configFile: false,
  plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }], '@babel/plugin-transform-modules-commonjs'],
}).code;
const cardModule = { exports: {} };
vm.runInThisContext(`(function(require,module,exports){${cardCode}\n})`, { filename: cardFile })(imports, cardModule, cardModule.exports);
platform.OS = 'web';
renderToStaticMarkup(React.createElement(cardModule.exports.default, { style: { borderColor: '#365059', shadowOpacity: 0 } }, 'Section'));
assert.equal(captured.onPointerEnter, undefined, 'Sections do not start hover outlines');
assert.equal(captured.onPointerLeave, undefined, 'Sections do not track pointer hover');
assert.equal(flatten(captured.style).borderColor, '#365059', 'Section border stays at its original color');
assert.equal(flatten(captured.style).shadowOpacity, 0, 'Sections preserve their original shadow');
assert.equal(flatten(captured.style).transitionProperty, undefined, 'Sections have no hover transitions');
console.log('PASS: button hover, stationary sections and links, no hover outlines, disabled states, reduced motion, provider scope, native styling and event/ref forwarding.');
