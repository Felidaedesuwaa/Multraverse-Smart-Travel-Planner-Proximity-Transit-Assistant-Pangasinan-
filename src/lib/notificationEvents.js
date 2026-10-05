import AsyncStorage from '@react-native-async-storage/async-storage';

const listeners = new Set();
let queue = Promise.resolve();
export const subscribeNotifications = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export const notifyUpdates = () => listeners.forEach(listener => listener());
export const getArrivalNotices = async ownerId => {
  try {
    const items = JSON.parse(await AsyncStorage.getItem(`notifications:arrivals:${ownerId}`));
    return Array.isArray(items) ? items : [];
  } catch { return []; }
};
export function recordArrival(ownerId, id, destination, message) {
  if (!ownerId) return Promise.resolve();
  const operation = queue.then(async () => {
    const previous = await getArrivalNotices(ownerId);
    if (previous.some(item => item.id === id)) return;
    await AsyncStorage.setItem(`notifications:arrivals:${ownerId}`, JSON.stringify([
      { id, type: 'arrival', title: 'Transit destination reached', message: `${destination || 'Your stop'}: ${message}`, createdAt: new Date().toISOString(), screen: 'TransitAlarm' }, ...previous,
    ].slice(0, 50)));
    notifyUpdates();
  });
  queue = operation.catch(() => {});
  return operation;
}
