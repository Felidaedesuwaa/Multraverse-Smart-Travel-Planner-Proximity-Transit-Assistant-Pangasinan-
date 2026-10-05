const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), babel = require('@babel/core');
const source = babel.transformSync(fs.readFileSync('src/lib/transitAlerts.web.js', 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
let permission = 'granted', vibrateAccepted = true, sounds = 0, registered = 0;
const vibrations = [], notices = [];
const registration = { active: {}, showNotification: async (title, options) => notices.push({ title, ...options }) };
class AudioContext {
  state = 'suspended'; currentTime = 0; destination = {};
  async resume() { this.state = 'running'; }
  async close() { this.state = 'closed'; }
  createOscillator() { return { frequency: {}, connect() {}, disconnect() {}, start() { sounds++; }, stop() {} }; }
  createGain() { return { connect() {}, disconnect() {}, gain: { setValueAtTime() {}, linearRampToValueAtTime() {} } }; }
}
const sandbox = { exports: {}, setTimeout, clearTimeout, isSecureContext: true, AudioContext,
  Notification: { requestPermission: async () => permission },
  navigator: { vibrate: value => { vibrations.push(value); return vibrateAccepted; }, serviceWorker: { register: async () => { registered++; return registration; } } },
};
vm.runInNewContext(source, sandbox);
const alerts = sandbox.exports;
(async () => {
  await alerts.prepareTransitAlert('sound');
  await alerts.deliverTransitAlert({ mode: 'sound', title: 'Test', body: 'Test' });
  assert.equal(sounds, 1);
  await alerts.prepareTransitAlert('vibrate');
  await alerts.deliverTransitAlert({ mode: 'vibrate' });
  assert.equal(JSON.stringify(vibrations[0]), '[700,250,700]');
  vibrateAccepted = false; await assert.rejects(alerts.deliverTransitAlert({ mode: 'vibrate' }), /rejected/);
  delete sandbox.navigator.vibrate;
  assert.equal(alerts.getTransitAlertCapabilities().vibrate.available, false);
  await assert.rejects(alerts.prepareTransitAlert('vibrate'), /iPhone Safari/);
  permission = 'denied'; await assert.rejects(alerts.prepareTransitAlert('push'), /blocked/);
  assert.equal(registered, 0);
  permission = 'granted'; await alerts.prepareTransitAlert('push');
  await alerts.deliverTransitAlert({ mode: 'push', title: 'Transit Alarm test', body: 'Simulation only' });
  assert.equal(registered, 1); assert.equal(notices.length, 1); assert.equal(notices[0].silent, true);
  assert.equal(notices[0].body, 'Simulation only');
  sandbox.isSecureContext = false;
  await assert.rejects(alerts.prepareTransitAlert('push'), /HTTPS/);
  sandbox.isSecureContext = true; delete sandbox.Notification;
  assert.equal(alerts.getTransitAlertCapabilities().push.available, false);
  alerts.stopTransitAlertPlayback();
  await assert.rejects(alerts.deliverTransitAlert({ mode: 'sound' }), /paused/);
  console.log('Web alert checks passed: audio, vibration capability/rejection, permission denial, secure contexts, service-worker notifications and playback cleanup.');
})().catch(error => { console.error(error); process.exitCode = 1; });
