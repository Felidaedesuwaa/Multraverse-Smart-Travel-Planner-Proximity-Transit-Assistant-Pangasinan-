let audio, worker;
// The permission overlay is mobile-only; browser modes keep their own checks.
export const hasTransitNotificationPermission = permission => !!permission.granted;
export const getTransitNotificationPermission = async () => ({ granted: true });
export const requestTransitNotificationPermission = getTransitNotificationPermission;
export const openTransitNotificationSettings = async () => {};
const tones = new Set();
const unsupportedVibration = 'Vibration is unavailable in this browser (including iPhone Safari). Use the installed mobile app on a physical phone.';
const unsupportedNotifications = 'System notifications are unavailable here. Try an HTTPS website in a supported browser, or use the installed mobile app.';

export const getTransitAlertCapabilities = () => ({
  vibrate: { available: typeof globalThis.navigator?.vibrate === 'function', detail: typeof globalThis.navigator?.vibrate === 'function' ? 'Browser vibration; device support may vary.' : unsupportedVibration },
  sound: { available: !!(globalThis.AudioContext || globalThis.webkitAudioContext), detail: 'Plays a short tone while this page is open. Turn up media volume.' },
  push: { available: !!(globalThis.isSecureContext && globalThis.Notification && globalThis.navigator?.serviceWorker), detail: globalThis.isSecureContext && globalThis.Notification && globalThis.navigator?.serviceWorker ? 'System notification; permission is requested when you test.' : unsupportedNotifications },
});

async function notificationWorker() {
  if (worker?.active) return worker;
  const registration = await navigator.serviceWorker.register('/transit-alerts-sw.js', { scope: '/' });
  if (!registration.active) await new Promise((resolve, reject) => {
    const installing = registration.installing || registration.waiting;
    if (!installing) return reject(new Error('Notification setup failed. Reload this page and retry.'));
    const timeout = setTimeout(() => finish(new Error('Notification setup timed out. Reload and retry.')), 8000);
    const finish = error => { clearTimeout(timeout); installing.removeEventListener('statechange', changed); error ? reject(error) : resolve(); };
    const changed = () => {
      if (installing.state === 'activated') finish();
      else if (installing.state === 'redundant') finish(new Error('Notification setup failed. Reload and retry.'));
    };
    installing.addEventListener('statechange', changed);
    changed();
  });
  worker = registration;
  return worker;
}

export async function prepareTransitAlert(mode) {
  const capability = getTransitAlertCapabilities()[mode];
  if (!capability?.available) throw new Error(capability?.detail || 'Choose an alert mode.');
  if (mode === 'sound') {
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!audio || audio.state === 'closed') audio = new AudioContext();
    await audio.resume();
    if (audio.state !== 'running') throw new Error('Audio is blocked. Tap Test alert now again to enable sound.');
  }
  if (mode === 'push') {
    // Request directly from the user's tap, before awaiting worker setup.
    if (await globalThis.Notification.requestPermission() !== 'granted') throw new Error('Notifications are blocked. Allow notifications for this website in browser settings, then retry.');
    await notificationWorker();
  }
}

export async function deliverTransitAlert({ mode, title, body }) {
  if (mode === 'vibrate') {
    if (!getTransitAlertCapabilities().vibrate.available) throw new Error(unsupportedVibration);
    if (!navigator.vibrate([700, 250, 700])) throw new Error('The browser rejected vibration. Try a physical Android phone with vibration enabled.');
  } else if (mode === 'sound') {
    if (audio?.state !== 'running') throw new Error('Audio is paused. Tap Test alert now again to enable sound.');
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.connect(gain); gain.connect(audio.destination);
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0, audio.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, audio.currentTime + 0.04);
    gain.gain.setValueAtTime(0.2, audio.currentTime + 1.1);
    gain.gain.linearRampToValueAtTime(0, audio.currentTime + 1.4);
    tones.add(oscillator);
    oscillator.onended = () => { tones.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(); oscillator.stop(audio.currentTime + 1.5);
  } else if (mode === 'push') {
    const registration = await notificationWorker();
    await registration.showNotification(title, { body, tag: 'multraverse-transit-alert', silent: true, data: { url: '/transit-alarm' } });
  } else throw new Error('Choose an alert mode.');
}

export function stopTransitAlertPlayback() {
  navigator.vibrate?.(0);
  for (const tone of tones) { try { tone.stop(); } catch {} }
  tones.clear();
  const previous = audio;
  audio = null;
  previous?.close().catch(() => {});
}
