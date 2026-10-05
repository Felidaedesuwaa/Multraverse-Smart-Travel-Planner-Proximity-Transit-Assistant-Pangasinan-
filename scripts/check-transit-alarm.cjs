// Exercise the actual task with mocked device APIs; never writes to a database.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const babel = require('@babel/core');
const cache = new Map();
const values = new Map([['user', JSON.stringify({ id: 'traveler' })]]);
let task, started = false, notifications = [], failNotify = false, denyBackground = false, denyNotifications = false, handler;
const vibrations = [], channels = [];
const mocks = {
  '@react-native-async-storage/async-storage': { getItem: async key => values.get(key) || null, setItem: async (key, value) => values.set(key, value), removeItem: async key => values.delete(key) },
  'react-native': { Platform: { OS: 'android' }, Vibration: { vibrate: value => vibrations.push(value), cancel() {} } },
  'expo-task-manager': { defineTask: (_name, fn) => { task = fn; }, isAvailableAsync: async () => true },
  'expo-location': { Accuracy: { High: 4 }, ActivityType: { AutomotiveNavigation: 1 }, requestForegroundPermissionsAsync: async () => ({ granted: true }), requestBackgroundPermissionsAsync: async () => ({ granted: !denyBackground }), hasStartedLocationUpdatesAsync: async () => started, startLocationUpdatesAsync: async (_name, configuration) => { assert.equal(configuration.pausesLocationUpdatesAutomatically, false); assert.equal(configuration.showsBackgroundLocationIndicator, true); assert.equal(configuration.foregroundService.killServiceOnDestroy, true); started = true; }, stopLocationUpdatesAsync: async () => { started = false; } },
  'expo-notifications': { AndroidImportance: { HIGH: 4 }, setNotificationHandler: value => { handler = value; }, setNotificationChannelAsync: async (id, value) => channels.push({ id, ...value }), getPermissionsAsync: async () => ({ granted: !denyNotifications }), requestPermissionsAsync: async () => ({ granted: !denyNotifications }), scheduleNotificationAsync: async value => { if (failNotify) throw Error('OS failure'); notifications.push(value); } },
};
function load(file) {
  const filename = path.resolve(__dirname, '..', file);
  if (cache.has(filename)) return cache.get(filename).exports;
  if (filename.endsWith('.json')) return JSON.parse(fs.readFileSync(filename));
  const module = { exports: {} }; cache.set(filename, module);
  const code = babel.transformSync(fs.readFileSync(filename, 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  const requireModule = name => {
    if (mocks[name]) return mocks[name];
    const target = path.resolve(path.dirname(filename), name + (name.endsWith('.json') ? '' : '.js'));
    const native = target.replace(/\.js$/, '.native.js');
    return load(path.relative(path.resolve(__dirname, '..'), fs.existsSync(native) ? native : target));
  };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { console, Date, Set, Promise })(requireModule, module, module.exports);
  return module.exports;
}
const geometry = load('src/lib/transitGeometry.js');
const { estimateTraditionalJeepneyFare } = load('src/lib/transitFare.js');
assert.equal(estimateTraditionalJeepneyFare(1), 14);
assert.equal(estimateTraditionalJeepneyFare(4), 14);
assert.equal(estimateTraditionalJeepneyFare(5), 16);
assert.equal(estimateTraditionalJeepneyFare(52.8), 111.6);
for (const km of [-1, undefined, NaN, Infinity]) assert.equal(estimateTraditionalJeepneyFare(km), null);
const service = load('src/lib/transitTracking.native.js');
const stop = { name: 'Test stop', lat: 16.043, lng: 120.334, areaId: 'dagupan' };
const position = (accuracy = 10, timestamp = Date.now()) => ({ timestamp, coords: { latitude: stop.lat, longitude: stop.lng, accuracy } });
const options = { ownerId: 'traveler', route: { id: 'test', stops: [stop] }, stopIndex: 0, radius: 500, mode: 'vibrate' };
(async () => {
  assert.equal(geometry.municipality(stop), 'dagupan');
  assert.equal(geometry.municipality({ lat: 14.5995, lng: 120.9842 }), undefined);
  assert.equal(geometry.distanceMeters({ latitude: stop.lat, longitude: stop.lng }, stop), 0);
  const pinned = { ...stop, name: 'Pinned destination' };
  assert.equal(geometry.isArrival(position(), pinned, 100), true);
  assert.equal(geometry.isArrival(position(), stop, 500), true);
  for (const p of [position(200), position(-1), position(10, Date.now() - 31000), position(10, Date.now() + 10000)]) assert.equal(geometry.isArrival(p, stop, 500), false);
  assert.equal(geometry.isArrival(position(), { ...stop, areaId: 'alaminos' }, 500), false);
  assert.equal(geometry.isArrival({ ...position(), coords: { latitude: 16.05, longitude: 120.334, accuracy: 10 } }, stop, 500), false);
  denyBackground = true; await assert.rejects(service.startTransitAlarm(options)); assert.equal(started, false); denyBackground = false;
  await service.startTransitAlarm(options); assert.equal(started, true);
  await task({ data: { locations: [position(200)] } }); assert.equal(notifications.length, 0);
  await Promise.all([task({ data: { locations: [position()] } }), task({ data: { locations: [position()] } })]);
  assert.equal(notifications.length, 1); assert.equal(started, false); assert.equal((await service.getTransitSession()).active, false);
  await service.startTransitAlarm(options); await service.stopTransitAlarm();
  await task({ data: { locations: [position()] } }); assert.equal(notifications.length, 1); assert.equal(await service.getTransitSession(), null);
  const pending = service.startTransitAlarm(options); await service.stopTransitAlarm(); await assert.rejects(pending); assert.equal(started, false);
  await service.startTransitAlarm(options); failNotify = true;
  await task({ data: { locations: [position()] } }); assert.match((await service.getTransitSession()).message, /could not be delivered/); assert.equal(started, false); failNotify = false;
  await service.startTransitAlarm(options); await task({ error: { message: 'GPS unavailable' } }); assert.equal(started, false);
  await service.startTransitAlarm(options); values.delete('user');
  await task({ data: { locations: [position()] } }); assert.equal(started, false); assert.equal(await service.getTransitSession(), null);
  values.set('user', JSON.stringify({ id: 'traveler' }));
  await service.startTransitAlarm(options); const key = 'multraverse.transit-session.v1'; const session = JSON.parse(values.get(key)); values.set(key, JSON.stringify({ ...session, expiresAt: 1 }));
  await task({ data: { locations: [position()] } }); assert.equal(started, false); assert.match((await service.getTransitSession()).message, /expired/);
  for (const mode of ['vibrate', 'sound', 'push']) {
    await service.startTransitAlarm({ ...options, mode });
    const channel = channels.at(-1);
    assert.equal(channel.enableVibrate, mode === 'vibrate');
    assert.equal(channel.sound, mode === 'sound' ? 'default' : null);
    await task({ data: { locations: [position()] } });
    const notification = notifications.at(-1);
    assert.equal(notification.content.sound, mode === 'sound' ? 'default' : false);
    assert.equal(notification.trigger.channelId, `transit-${mode}-v2`);
    assert.equal((await handler.handleNotification({ request: notification })).shouldPlaySound, true);
  }
  mocks['react-native'].Platform.OS = 'ios';
  await handler.handleNotification({ request: { content: { data: { mode: 'vibrate' } } } });
  assert.equal(vibrations.length, 1);
  assert.equal((await handler.handleNotification({ request: { content: { data: { mode: 'push' } } } })).shouldPlaySound, false);
  values.delete('user'); await assert.rejects(service.startTransitAlarm(options));
  const alerts = load('src/lib/transitAlerts.native.js');
  const demo = load('src/lib/transitAlarmTest.js');
  for (const radius of [100, 300, 500, 1000, 2000]) {
    assert.equal(demo.testHasArrived(false, radius), false);
    assert.equal(demo.testHasArrived(true, radius), true);
  }
  mocks['react-native'].Platform.OS = 'android';
  const before = notifications.length;
  await alerts.prepareTransitAlert('vibrate');
  await alerts.deliverTransitAlert({ mode: 'vibrate', title: 'Test', body: 'Test only', test: true });
  assert.equal(vibrations.length, 2); assert.equal(notifications.length, before);
  for (const mode of ['sound', 'push']) {
    await alerts.prepareTransitAlert(mode);
    await alerts.deliverTransitAlert({ mode, title: 'Test', body: 'Test only', test: true });
    const value = notifications.at(-1), channel = channels.at(-1);
    assert.equal(value.content.data.test, true);
    assert.equal(value.content.sound, mode === 'sound' ? 'default' : false);
    assert.equal(value.trigger.channelId, `transit-${mode}-v2`);
    assert.equal(channel.sound, mode === 'sound' ? 'default' : null);
    assert.equal(channel.enableVibrate, false);
    assert.equal((await handler.handleNotification({ request: value })).shouldShowBanner, true);
  }
  denyNotifications = true;
  for (const mode of ['vibrate', 'sound', 'push']) {
    await assert.rejects(alerts.prepareTransitAlert(mode), /blocked/);
    await assert.rejects(alerts.deliverTransitAlert({ mode, title: 'Test', body: 'Blocked' }), /blocked/);
  }
  assert.equal(vibrations.length, 2, 'Denied permissions must also prevent direct vibration');
  assert.equal((await handler.handleNotification({ request: { content: { data: { mode: 'vibrate' } } } })).shouldShowBanner, false);
  denyNotifications = false;
  mocks['react-native'].Platform.OS = 'ios';
  await alerts.prepareTransitAlert('sound');
  await alerts.deliverTransitAlert({ mode: 'sound', title: 'Test', body: 'Test only' });
  assert.equal(notifications.at(-1).trigger, null);
  assert.equal((await handler.handleNotification({ request: notifications.at(-1) })).shouldPlaySound, true);
  await alerts.deliverTransitAlert({ mode: 'push', title: 'Test', body: 'Test only' });
  assert.equal((await handler.handleNotification({ request: notifications.at(-1) })).shouldPlaySound, false);
  // Validate the actual delivered notification and restored session message,
  // including radii saved before these wording changes.
  values.set('user', JSON.stringify({ id: 'traveler' }));
  for (const platform of ['ios', 'android']) {
    mocks['react-native'].Platform.OS = platform;
    for (const mode of ['vibrate', 'sound', 'push']) {
      const beforeVibration = vibrations.length, beforeNotification = notifications.length;
      await service.startTransitAlarm({ ...options, mode });
      // No foreground screen, timer or notification handler runs in this test.
      await task({ data: { locations: [position()] } });
      assert.equal(notifications.length, beforeNotification + 1);
      assert.equal(vibrations.length, beforeVibration, 'Locked-screen delivery must use the OS, not foreground vibration');
      assert.equal(notifications.at(-1).content.sound, mode === 'sound' ? 'default' : platform === 'ios' && mode === 'vibrate' ? 'transit_vibrate.wav' : false);
      assert.equal(started, false, 'Each locked-screen arrival must stop tracking after one alert');
    }
    await service.startTransitAlarm(options);
    const beforeNotification = notifications.length;
    denyNotifications = true;
    await task({ data: { locations: [position()] } });
    assert.equal(notifications.length, beforeNotification, 'Revoking permissions while locked prevents delivery');
    assert.match((await service.getTransitSession()).message, /could not be delivered/);
    assert.equal(started, false);
    denyNotifications = false;
  }
  const config = JSON.parse(fs.readFileSync('app.json'));
  const sounds = config.expo.plugins.find(plugin => Array.isArray(plugin) && plugin[0] === 'expo-notifications')[1].sounds;
  for (const asset of sounds) assert.match(path.basename(asset, path.extname(asset)), /^[a-z][a-z0-9_]*$/, 'Notification sound names must be valid Android resources');
  const sound = fs.readFileSync(sounds[0]);
  assert.equal(sound.toString('ascii', 0, 4), 'RIFF');
  assert.equal(sound.toString('ascii', 8, 12), 'WAVE');
  assert.equal(sound.readUInt32LE(4) + 8, sound.length);
  assert(sound.subarray(44).every(byte => byte === 0), 'Vibrate notification resource must contain no audible samples');
  for (const platform of ['ios', 'android']) {
    mocks['react-native'].Platform.OS = platform;
    for (const radius of [100, 300, 500, 1000, 2000]) {
      await service.startTransitAlarm({ ...options, mode: 'push', radius });
      await task({ data: { locations: [position()] } });
      const expected = `You are ${radius} m away from your destination. Please prepare to make a stop`;
      assert.equal(notifications.at(-1).content.body, expected);
      assert.equal((await service.getTransitSession()).message, expected);
    }
  }
  console.log('Transit alarm checks passed: accuracy, stale fixes, permissions, one-shot delivery, cancellation, logout ownership, notification errors and expiry.');
  console.log('Alert tests passed: simulated arrivals at every radius, native vibration, sound/notification channels, iOS delivery and denied notification permission.');
})().catch(error => { console.error(error); process.exitCode = 1; });
