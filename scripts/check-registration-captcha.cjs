const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const babel = require('@babel/core');
let slots, index, platform, verifiedProof, request, calls, registerPayload;
const h = (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) });
const native = {
  ...Object.fromEntries(['View', 'Text', 'TextInput', 'Pressable', 'ScrollView', 'Modal', 'ActivityIndicator'].map(name => [name, name])),
  StyleSheet: { create: value => value }, Platform: { get OS() { return platform; } },
};
const hooks = {
  useState(initial) { const slot = index++; if (!(slot in slots)) slots[slot] = typeof initial === 'function' ? initial() : initial; return [slots[slot], value => { slots[slot] = typeof value === 'function' ? value(slots[slot]) : value; }]; },
  useRef(value) { const slot = index++; return slots[slot] ||= { current: value }; },
  useEffect() { index++; },
};
const store = () => ({ register: async payload => { registerPayload = payload; return null; }, isLoading: false });
store.getState = () => ({ error: 'Test response', fieldErrors: {} });
function load(file) {
  const code = babel.transformSync(fs.readFileSync(file, 'utf8'), { babelrc: false, configFile: false,
    plugins: [['@babel/plugin-transform-react-jsx', { pragma: 'h', pragmaFrag: 'Fragment' }], '@babel/plugin-transform-modules-commonjs'],
  }).code;
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports,h){${code}\n})`, { filename: file })(name => {
    if (name === 'react') return hooks;
    if (name === 'react-native') return native;
    if (name === 'react-native-webview') return { WebView: 'WebView' };
    if (name.includes('captchaConfig')) return { captchaSiteKey: 'public-widget-key', nativeCaptchaUrl: () => 'https://web.test/captcha.html?sitekey=public-widget-key' };
    if (name.includes('useAppTheme')) return { useAppTheme: () => ({ themeStyle: value => value }) };
    if (name.includes('/api')) return { api: { verifyCaptcha: () => { calls++; return request; } } };
    if (name.includes('validation')) return { normalizeName: value => value.trim(), registrationFullName: () => 'Juan Cruz', validateRegistration: fields => ({ email: !fields.email, firstName: !fields.firstName, surname: !fields.surname, password: !fields.password, confirm: fields.password !== fields.confirm }) };
    if (name.includes('authStore')) return { useAuthStore: store };
    if (name === '@react-navigation/native') return { useNavigation: () => ({ navigate() {} }) };
    if (name === 'lucide-react-native') return { Check: 'Check' };
    if (name.includes('colors')) return { colors: { white: '#fff' } };
    return { __esModule: true, default: name.split('/').pop() };
  }, module, module.exports, h);
  return module.exports.default;
}
const Captcha = load('src/components/RegistrationCaptcha.jsx');
const Register = load('src/pages/RegisterPage.jsx');
const NativeChallenge = load('src/components/CaptchaChallenge.native.jsx');
const all = (tree, predicate) => !tree || typeof tree !== 'object' ? [] : [...(predicate(tree) ? [tree] : []), ...(tree.children || []).flatMap(child => all(child, predicate))];
const one = (tree, predicate) => { const matches = all(tree, predicate); assert.equal(matches.length, 1); return matches[0]; };
const render = (Component, props = {}) => { index = 0; return Component(props); };
const reset = () => { slots = []; verifiedProof = null; calls = 0; };
const settle = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  for (platform of ['web', 'android', 'ios']) {
    reset();
    const props = () => ({ proof: verifiedProof, onVerified: value => { verifiedProof = value; }, disabled: false });
    let tree = render(Captcha, props());
    const checkbox = () => one(tree, node => node.props.accessibilityRole === 'checkbox');
    assert.equal(checkbox().props.accessibilityState.checked, false);
    checkbox().props.onPress(); tree = render(Captcha, props());
    assert.equal(one(tree, node => node.type === 'Modal').props.visible, true);
    one(tree, node => node.type === 'Pressable' && node.props.accessibilityRole === 'button').props.onPress();
    tree = render(Captcha, props());
    assert.equal(one(tree, node => node.type === 'Modal').props.visible, false);
    assert.equal(checkbox().props.accessibilityState.checked, false, 'Cancellation must not check the box');
    checkbox().props.onPress(); tree = render(Captcha, props());
    let resolve;
    request = new Promise(done => { resolve = done; });
    const challenge = one(tree, node => node.type === 'CaptchaChallenge');
    const pending = challenge.props.onToken('token');
    challenge.props.onToken('duplicate');
    tree = render(Captcha, props());
    assert.equal(calls, 1);
    assert.equal(checkbox().props.accessibilityState.checked, false, 'Wait for backend verification');
    one(tree, node => node.type === 'Modal').props.onRequestClose();
    tree = render(Captcha, props());
    assert.equal(one(tree, node => node.type === 'Modal').props.visible, true, 'Cannot dismiss while server verifies');
    resolve({ captchaProof: 'a'.repeat(64), expiresAt: new Date(Date.now() + 60000).toISOString() });
    await pending;
    tree = render(Captcha, props());
    assert.equal(checkbox().props.accessibilityState.checked, true);
    assert.equal(checkbox().props.disabled, true, 'Successful check is locked');
    assert.equal(one(tree, node => node.type === 'Modal').props.visible, false);
    reset(); tree = render(Captcha, props());
    assert.equal(checkbox().props.accessibilityState.checked, false, 'Refresh/reopening resets the check');
    checkbox().props.onPress(); tree = render(Captcha, props());
    request = Promise.reject(new Error('Provider unavailable'));
    await one(tree, node => node.type === 'CaptchaChallenge').props.onToken('token');
    tree = render(Captcha, props());
    assert.equal(checkbox().props.accessibilityState.checked, false);
    assert.equal(all(tree, node => node.props.accessibilityRole === 'alert').length, 1);

    reset(); tree = render(Register);
    for (const [label, value] of [['First name', 'Juan'], ['Surname', 'Cruz'], ['Email', 'juan@gmail.com'], ['Password', 'Lakbay_2026'], ['Confirm password', 'Lakbay_2026']]) {
      one(tree, node => node.type === 'AuthInput' && node.props.label === label).props.onChangeText(value);
      tree = render(Register);
    }
    one(tree, node => node.props.accessibilityRole === 'checkbox').props.onPress(); tree = render(Register);
    assert.equal(one(tree, node => node.type === 'GradientButton' && node.props.label === 'Register').props.disabled, true);
    one(tree, node => node.type === 'RegistrationCaptcha').props.onVerified({ captchaProof: 'b'.repeat(64), expiresAt: new Date(Date.now() + 60000).toISOString() });
    tree = render(Register);
    const submit = one(tree, node => node.type === 'GradientButton' && node.props.label === 'Register');
    assert.equal(submit.props.disabled, false);
    await submit.props.onPress(); await settle();
    assert.equal(registerPayload.captchaProof, 'b'.repeat(64), 'Registration must submit the server-issued pass');
  }
  reset();
  let bridgeTokens = 0;
  const webview = render(NativeChallenge, { onToken: () => { bridgeTokens++; }, onError: () => assert.fail('Unexpected bridge error') });
  assert.equal(webview.type, 'WebView');
  assert.equal(webview.props.source.uri, 'https://web.test/captcha.html?sitekey=public-widget-key');
  assert.equal(webview.props.onShouldStartLoadWithRequest({ url: 'https://evil.test/captcha.html' }), false);
  for (const url of ['about:blank', 'about:srcdoc', 'https://challenges.cloudflare.com/check']) assert.equal(webview.props.onShouldStartLoadWithRequest({ url }), true);
  const message = url => ({ nativeEvent: { url, data: JSON.stringify({ type: 'captcha-token', token: 'provider-token' }) } });
  webview.props.onMessage(message('https://evil.test/captcha.html'));
  webview.props.onMessage(message('https://web.test/other.html'));
  assert.equal(bridgeTokens, 0);
  webview.props.onMessage(message('https://web.test/captcha.html?sitekey=public-widget-key'));
  webview.props.onMessage(message('https://web.test/captcha.html?sitekey=public-widget-key'));
  assert.equal(bridgeTokens, 1, 'Only one token from the trusted hosted page is accepted');
  const html = fs.readFileSync('public/captcha.html', 'utf8');
  const bridgeMessages = [], elements = { status: {}, challenge: {} };
  let widget;
  const context = vm.createContext({
    URLSearchParams, location: { search: '?sitekey=public-widget-key' },
    document: { getElementById: id => elements[id] },
    window: { ReactNativeWebView: { postMessage: data => bridgeMessages.push(JSON.parse(data)) } },
    turnstile: { render: (_selector, options) => { widget = options; } },
    setTimeout: () => 1, clearTimeout() {},
  });
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
  context.startChallenge();
  assert.equal(widget.sitekey, 'public-widget-key'); assert.equal(widget.action, 'register');
  widget.callback('provider-token');
  assert.deepEqual(bridgeMessages, [{ type: 'captcha-token', token: 'provider-token' }]);
  widget['error-callback'](); assert.equal(bridgeMessages[1].type, 'captcha-error');
  const buildEnv = { ...process.env, VERCEL: '1', VERCEL_ENV: 'production', EXPO_PUBLIC_API_URL: 'https://multraverse-backend.vercel.app' };
  for (const [siteKey, status] of [['', 1], ['bad', 1], ['1x00000000000000000000AA', 1], ['0x4AAAAAAA_public_fixture', 0]]) {
    const result = require('node:child_process').spawnSync(process.execPath, ['scripts/check-web-deployment.cjs'], {
      env: { ...buildEnv, EXPO_PUBLIC_TURNSTILE_SITE_KEY: siteKey },
    });
    assert.equal(result.status, status, 'Vercel must require a real site key for production builds');
  }
  console.log('PASS: web/Android/iOS registration gate, cancellation/failure, server-confirmed locked checkbox, refresh reset, pass submission and native trusted-page token bridge.');
})().catch(error => { console.error(error); process.exitCode = 1; });
