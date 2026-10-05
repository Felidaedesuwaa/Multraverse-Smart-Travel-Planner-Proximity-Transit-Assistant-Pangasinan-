import { Linking, Platform, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';

export const transitChannel = mode => `transit-${mode}-v2`;
// iOS has no independent background vibration API. A silent notification sound
// lets the OS apply its notification haptics without playing an audible tone.
export const transitVibrationSound = 'transit_vibrate.wav';
export const hasTransitNotificationPermission = permission => !!permission.granted;
export const getTransitNotificationPermission = () => Notifications.getPermissionsAsync();
export const openTransitNotificationSettings = () => Linking.openSettings();
export const getTransitAlertCapabilities = () => ({
  vibrate: { available: true, detail: Platform.OS === 'ios' ? 'Enable device haptics and notification Sounds for locked-screen vibration. Test on a physical phone.' : 'Device vibration. Enable vibration for Multraverse notifications in phone settings.' },
  sound: { available: true, detail: 'System alert sound. Allow notifications and turn up alert volume.' },
  push: { available: true, detail: 'System notification. Allow Multraverse notifications on the lock screen in phone settings.' },
});

Notifications.setNotificationHandler({ handleNotification: async notification => {
  const mode = notification.request.content.data?.mode;
  if (!hasTransitNotificationPermission(await getTransitNotificationPermission())) {
    return { shouldShowBanner: false, shouldShowList: false, shouldSetBadge: false, shouldPlaySound: false };
  }
  if (Platform.OS === 'ios' && mode === 'vibrate') Vibration.vibrate([0, 700, 250, 700]);
  return {
    shouldShowBanner: true, shouldShowList: true, shouldSetBadge: false,
    // Android needs this flag for a foreground heads-up banner. The channel
    // controls whether it actually makes sound; Notify and Vibrate stay silent.
    shouldPlaySound: Platform.OS === 'android' || mode === 'sound',
  };
} });

async function ensureTransitChannel(mode) {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(transitChannel(mode), {
    name: `Transit ${mode === 'push' ? 'notification' : mode} alerts`,
    importance: Notifications.AndroidImportance.HIGH,
    sound: mode === 'sound' ? 'default' : null,
    enableVibrate: mode === 'vibrate',
    vibrationPattern: mode === 'vibrate' ? [0, 700, 250, 700] : [0],
  });
}

export async function requestTransitNotificationPermission() {
  // Android 13 needs a channel before it can show the permission prompt.
  for (const mode of ['vibrate', 'sound', 'push']) await ensureTransitChannel(mode);
  return Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
}

export async function prepareTransitAlert(mode) {
  if (!['vibrate', 'sound', 'push'].includes(mode)) throw new Error('Choose an alert mode.');
  await ensureTransitChannel(mode);
  let permission = await getTransitNotificationPermission();
  if (!hasTransitNotificationPermission(permission) && permission.canAskAgain !== false) permission = await requestTransitNotificationPermission();
  if (!hasTransitNotificationPermission(permission)) {
    throw new Error('Notifications are blocked. Allow Multraverse notifications in device settings, then try again.');
  }
}

export async function deliverTransitAlert({ mode, title, body, identifier, background = false, test = false }) {
  if (!['vibrate', 'sound', 'push'].includes(mode)) throw new Error('Choose an alert mode.');
  // Permission may have been revoked after arming. Do not prompt from a task.
  if (!hasTransitNotificationPermission(await getTransitNotificationPermission())) throw new Error('Notifications are blocked. Allow Multraverse notifications in device settings, then try again.');
  if (mode === 'vibrate' && !background) {
    Vibration.vibrate([0, 700, 250, 700]);
    return;
  }
  await Notifications.scheduleNotificationAsync({
    ...(identifier ? { identifier } : {}),
    content: { title, body, sound: mode === 'sound' ? 'default' : Platform.OS === 'ios' && mode === 'vibrate' ? transitVibrationSound : false, data: { mode, test } },
    trigger: Platform.OS === 'android' ? { channelId: transitChannel(mode) } : null,
  });
}

export const stopTransitAlertPlayback = () => Vibration.cancel();
