import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { isArrival, municipality } from './transitGeometry';

const TASK = 'multraverse-transit-location-v1';
const KEY = 'multraverse.transit-session.v1';
const listeners = new Set();
// Serialize foreground changes and background callbacks to prevent duplicate alerts.
let queue = Promise.resolve();
let revision = 0;
const serial = operation => {
  const result = queue.then(operation);
  queue = result.catch(() => {});
  return result;
};
const read = async () => {
  try { return JSON.parse(await AsyncStorage.getItem(KEY)); } catch { return null; }
};
const publish = session => listeners.forEach(listener => listener(session));
async function stopUpdates() {
  if (await Location.hasStartedLocationUpdatesAsync(TASK)) await Location.stopLocationUpdatesAsync(TASK);
}
async function save(session) {
  if (session) await AsyncStorage.setItem(KEY, JSON.stringify(session));
  else await AsyncStorage.removeItem(KEY);
  publish(session);
}
Notifications.setNotificationHandler({ handleNotification: async notification => ({
  shouldShowBanner: true, shouldShowList: true,
  shouldPlaySound: notification.request.content.data?.mode === 'sound', shouldSetBadge: false,
}) });

TaskManager.defineTask(TASK, ({ data, error }) => serial(async () => {
  const session = await read();
  if (!session?.active) { await stopUpdates(); return; }
  const user = JSON.parse(await AsyncStorage.getItem('user') || 'null');
  if (user?.id !== session.ownerId) { await save(null); await stopUpdates(); return; }
  if (error || Date.now() >= session.expiresAt) {
    await save({ ...session, active: false, message: error ? 'GPS tracking failed. Resume tracking to retry.' : 'Trip alarm expired. Start a new alarm if you are still travelling.' });
    await stopUpdates(); return;
  }
  const position = data?.locations?.slice().sort((a, b) => b.timestamp - a.timestamp)[0];
  if (!isArrival(position, session.target, session.radius)) return;
  // Persist the one-shot claim before invoking the OS notification API.
  const message = `Approaching ${session.target.name}. Your stop is within ${session.radius} m.`;
  await save({ ...session, active: false, message });
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: session.id,
      content: { title: 'Your stop is approaching', body: message, sound: session.mode === 'sound' ? 'default' : false, data: { mode: session.mode } },
      trigger: Platform.OS === 'android' ? { channelId: `transit-${session.mode}-v1` } : null,
    });
  } catch {
    await save({ ...session, active: false, message: 'Stop reached, but the notification could not be delivered. Check notification settings.' });
  } finally { await stopUpdates(); }
}));

export const subscribeTransit = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export const stopTransitAlarm = () => {
  revision++;
  return serial(async () => { await save(null); await stopUpdates(); });
};
export const getTransitSession = () => serial(async () => {
  const session = await read();
  if (session?.active && (Date.now() >= session.expiresAt || !await Location.hasStartedLocationUpdatesAsync(TASK))) {
    await save(null); await stopUpdates(); return null;
  }
  return session;
});
export async function startTransitAlarm({ ownerId, route, stopIndex, radius, mode }) {
  const run = ++revision;
  const target = route?.stops?.[stopIndex];
  if (!ownerId || !target || municipality(target) !== target.areaId || ![100, 300, 500, 1000, 2000].includes(radius) || !['vibrate', 'sound', 'push'].includes(mode)) throw new Error('Choose a verified stop and alarm settings.');
  if (!await TaskManager.isAvailableAsync()) throw new Error('Install a new mobile build to use background alarms. Expo Go is not supported.');
  if (!(await Location.requestForegroundPermissionsAsync()).granted) throw new Error('Allow location access to start your trip alarm.');
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(`transit-${mode}-v1`, {
    name: `Transit ${mode === 'push' ? 'notification' : mode} alerts`, importance: Notifications.AndroidImportance.HIGH,
    sound: mode === 'sound' ? 'default' : null, enableVibrate: mode === 'vibrate', vibrationPattern: [0, 700, 250, 700],
  });
  if (!(await Notifications.requestPermissionsAsync()).granted) throw new Error('Allow notifications in device settings for stop alerts.');
  if (!(await Location.requestBackgroundPermissionsAsync()).granted) throw new Error('Allow location “all the time” in device settings for background stop alerts.');
  return serial(async () => {
    const user = JSON.parse(await AsyncStorage.getItem('user') || 'null');
    if (run !== revision || user?.id !== ownerId) throw new Error('Alarm setup cancelled. Please try again.');
    await save(null); await stopUpdates();
    const session = { id: `transit-${Date.now()}`, ownerId, route, stopIndex, target, radius, mode, active: true, expiresAt: Date.now() + 8 * 60 * 60 * 1000 };
    await save(session);
    try {
      await Location.startLocationUpdatesAsync(TASK, {
        accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 3000,
        pausesLocationUpdatesAutomatically: false, showsBackgroundLocationIndicator: true,
        activityType: Location.ActivityType.AutomotiveNavigation,
        foregroundService: { notificationTitle: 'Transit alarm active', notificationBody: 'Checking your stop during this trip. Open Multraverse to stop tracking.', killServiceOnDestroy: true },
      });
    } catch (error) { await save(null); await stopUpdates(); throw error; }
    return session;
  });
}
