# Transit vibration notification resource

`transit_vibrate.wav` is one second of silent, mono, 16-bit PCM at 44,100 Hz.
It contains no audible samples. The `expo-notifications` plugin bundles it into
new native builds; iOS background Vibrate notifications reference its filename.

iOS manages notification haptics through its sound/notification settings rather
than exposing a separate background vibration-pattern API. This silent sound
allows an OS notification to request that path without an audible tone. The
user's haptic, notification Sounds, silent-mode and Focus settings still apply.
Physical-device testing is required; requesting a notification does not prove
that the phone vibrated. Foreground Vibrate tests use direct device vibration.

`scripts/check-transit-alarm.cjs` verifies the WAV header, silent samples, build
configuration and background notification payload.
