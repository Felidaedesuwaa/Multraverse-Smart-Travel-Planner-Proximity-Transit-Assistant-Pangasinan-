const assert = require('node:assert/strict');

(async () => {
  const { convertFromPhp, convertToPhp, effectiveCurrency, formatPhp, moneyDisplay } = await import('../src/utils/currency.js');
  const { createTheme } = await import('../src/theme/theme.js');
  const rates = { PHP: 1, USD: 0.02, JPY: 3, KWD: 0.006 };
  assert.equal(convertFromPhp(500, 'USD', rates), 10);
  assert.equal(convertToPhp('10.25', 'USD', rates), '512.5');
  assert.equal(convertToPhp('0', 'USD', rates), '0');
  assert.equal(convertToPhp('', 'USD', rates), '');
  assert.equal(convertToPhp('not an amount', 'USD', rates), '');
  assert.equal(convertToPhp('-10', 'USD', rates), '');
  assert.equal(convertFromPhp(null, 'USD', rates), null);
  assert.equal(convertFromPhp(Infinity, 'USD', rates), null);
  const normalize = value => value.replace(/\s/g, ' ');
  assert.equal(normalize(formatPhp(500, 'USD', rates)), 'USD 10.00');
  assert.equal(normalize(formatPhp(500, 'JPY', rates)), 'JPY 1,500');
  assert.equal(normalize(formatPhp(500, 'KWD', rates)), 'KWD 3.000');
  assert.equal(normalize(formatPhp(0, 'USD', rates)), 'USD 0.00');
  const dual = moneyDisplay(500, 'USD', rates);
  assert.equal(normalize(dual.primary), 'USD 10.00');
  assert.equal(normalize(dual.reference), 'PHP 500.00');
  assert.equal(normalize(moneyDisplay(0, 'USD', rates).reference), 'PHP 0.00');
  assert.equal(normalize(moneyDisplay(-500, 'USD', rates).reference), '-PHP 500.00');
  assert.equal(moneyDisplay(500, 'PHP', rates).reference, null, 'No duplicate PHP reference');
  assert.equal(moneyDisplay(500, 'EUR', rates).reference, null, 'Unavailable rates show PHP only');
  assert.equal(moneyDisplay(null, 'USD', rates).reference, null, 'Unknown amounts are not zero');
  assert.equal(normalize(moneyDisplay(500, 'JPY', rates).reference), 'PHP 500.00', 'PHP retains cents regardless of selected currency');
  for (const invalidRate of [undefined, 0, -1, NaN, Infinity, '0.02']) {
    assert.equal(effectiveCurrency('USD', { USD: invalidRate }), 'PHP');
    assert.equal(normalize(formatPhp(500, 'USD', { USD: invalidRate })), 'PHP 500.00');
    assert.equal(convertToPhp('500', 'USD', { USD: invalidRate }), '500');
  }
  const light = createTheme(false);
  const dark = createTheme(true);
  const style = { backgroundColor: '#FFFFFF', color: '#0B3C5D', borderColor: '#E7E1D6', padding: 12 };
  assert.deepEqual(light.themeStyle(style), { backgroundColor: light.surface, color: light.text, borderColor: light.palette.line, padding: 12 });
  assert.deepEqual(light.themeStyle(light.themeStyle(style)), light.themeStyle(style), 'Nested components preserve resolved coastal colors');
  assert.equal(dark.themeStyle(style).backgroundColor, dark.surface);
  assert.equal(dark.themeStyle(style).color, dark.text);
  assert.equal(dark.themeStyle(style).padding, 12);
  assert.equal(style.backgroundColor, '#FFFFFF', 'The shared light styles must stay unchanged');
  assert.equal(dark.themeColor('#FFFFFF', 'color'), dark.text, 'Button labels use the coastal foreground');
  assert.equal(dark.themeColor('rgba(0,0,0,0.5)', 'backgroundColor'), 'rgba(0,0,0,0.5)');
  assert.notEqual(dark.themeColor('#F16B4E', 'backgroundColor'), '#F16B4E', 'Dark mode uses a softer coral button');
  assert.equal(dark.themeStyle(() => [style])({ pressed: true })[0].color, dark.text);
  const luminance = hex => {
    const rgb = [1,3,5].map(index => parseInt(hex.slice(index,index+2),16)/255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return rgb[0]*0.2126 + rgb[1]*0.7152 + rgb[2]*0.0722;
  };
  const contrast = (a,b) => (Math.max(luminance(a),luminance(b)) + 0.05) / (Math.min(luminance(a),luminance(b)) + 0.05);
  assert.equal(dark.themeColor('#F7F9FB', 'backgroundColor'), dark.background, 'All six travel pages share the app background');
  for (const foreground of ['#1A2E40', '#6B8CA8', '#4A6880', '#A8BECC']) {
    assert.ok(contrast(dark.themeColor(foreground), dark.surface) >= 4.5, 'Primary, supporting, and placeholder text stays readable');
  }
  for (const accent of ['#0B3C5D', '#F16B4E', '#2A7B4C', '#E8A33D']) {
    assert.ok(contrast(dark.themeColor('#FFFFFF'), dark.themeColor(accent, 'backgroundColor')) >= 4.5, 'Button labels remain readable on muted accents');
  }
  for (const [foreground, tint] of [['#F16B4E', '#FFF1EE'], ['#2A7B4C', '#EDF7EE'], ['#E8A33D', '#FFF8E1'], ['#1A5CB0', '#EAF1FB']]) {
    assert.ok(contrast(dark.themeColor(foreground), dark.themeColor(tint, 'backgroundColor')) >= 4.5, 'Status badges use readable, coordinated color pairs');
  }
  for (const fill of dark.mapColors.regions) {
    assert.ok(contrast(fill,dark.mapColors.water) >= 3, 'Map regions must stand out from the water');
    assert.ok(contrast(fill,dark.mapColors.label) >= 4.5, 'Map labels must remain readable on light regions');
  }
  const currencies = require('../src/data/currencies.json');
  assert.equal(new Set(currencies.map(item => item.code)).size, currencies.length);
  for (const item of currencies) assert.doesNotThrow(() => formatPhp(500, item.code, { PHP: 1, [item.code]: 1 }));
  console.log(`PASS: currency conversion, PHP input storage, precision, missing-rate fallback, dark theme roles, and ${currencies.length} currency codes.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
