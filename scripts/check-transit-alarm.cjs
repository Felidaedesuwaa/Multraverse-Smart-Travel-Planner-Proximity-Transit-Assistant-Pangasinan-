// Exercise the actual task with mocked device APIs; never writes to a database.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const babel = require('@babel/core');
const cache = new Map();
const values = new Map([['user', JSON.stringify({ id: 'traveler' })]]);
let task, started = false, notifications = [], failNotify = false, denyBackground = false;
const mocks = {
  '@react-native-async-storage/async-storage': { getItem: async key => values.get(key) || null, setItem: async (key, value) => values.set(key, value), removeItem: async key => values.delete(key) },
  'react-native': { Platform: { OS: 'android' } },
  'expo-task-manager': { defineTask: (_name, fn) => { task = fn; }, isAvailableAsync: async () => true },
  'expo-location': { Accuracy: { High: 4 }, ActivityType: { AutomotiveNavigation: 1 }, requestForegroundPermissionsAsync: async () => ({ granted: true }), requestBackgroundPermissionsAsync: async () => ({ granted: !denyBackground }), hasStartedLocationUpdatesAsync: async () => started, startLocationUpdatesAsync: async () => { started = true; }, stopLocationUpdatesAsync: async () => { started = false; } },
  'expo-notifications': { AndroidImportance: { HIGH: 4 }, setNotificationHandler() {}, setNotificationChannelAsync: async () => {}, requestPermissionsAsync: async () => ({ granted: true }), scheduleNotificationAsync: async value => { if (failNotify) throw Error('OS failure'); notifications.push(value); } },
};
function load(file) {
  const filename = path.resolve(__dirname, '..', file);
  if (cache.has(filename)) return cache.get(filename).exports;
  if (filename.endsWith('.json')) return JSON.parse(fs.readFileSync(filename));
  const module = { exports: {} }; cache.set(filename, module);
  const code = babel.transformSync(fs.readFileSync(filename, 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  const requireModule = name => mocks[name] || load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), name + (name.endsWith('.json') ? '' : '.js'))));
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { console, Date, Set, Promise })(requireModule, module, module.exports);
  return module.exports;
}
const geometry = load('src/lib/transitGeometry.js');
const service = load('src/lib/transitTracking.native.js');
const stop = { name: 'Test stop', lat: 16.043, lng: 120.334, areaId: 'dagupan' };
const position = (accuracy = 10, timestamp = Date.now()) => ({ timestamp, coords: { latitude: stop.lat, longitude: stop.lng, accuracy } });
const options = { ownerId: 'traveler', route: { id: 'test', stops: [stop] }, stopIndex: 0, radius: 500, mode: 'vibrate' };
(async () => {
  assert.equal(geometry.municipality(stop), 'dagupan');
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
  values.delete('user'); await assert.rejects(service.startTransitAlarm(options));
  console.log('Transit alarm checks passed: accuracy, stale fixes, permissions, one-shot delivery, cancellation, logout ownership, notification errors and expiry.');
})().catch(error => { console.error(error); process.exitCode = 1; });
