import { useRef } from 'react';
import { WebView } from 'react-native-webview';
import { Text } from 'react-native';
import { captchaSiteKey, nativeCaptchaUrl } from '../lib/captchaConfig';

export default function CaptchaChallenge({ onToken, onError }) {
  const completed = useRef(false);
  let uri;
  try {
    if (!captchaSiteKey) throw new Error('Bot verification is not configured. Please contact the site administrator.');
    uri = nativeCaptchaUrl();
  } catch (error) { return <Text accessibilityRole="alert" style={{ color: '#FF9B85' }}>{error.message}</Text>; }
  const page = new URL(uri);
  return <WebView
    source={{ uri }}
    style={{ height: 300, backgroundColor: 'transparent' }}
    javaScriptEnabled domStorageEnabled thirdPartyCookiesEnabled sharedCookiesEnabled
    originWhitelist={[page.origin, 'https://challenges.cloudflare.com', 'about:blank', 'about:srcdoc']}
    onShouldStartLoadWithRequest={request => {
      try {
        const url = new URL(request.url);
        return (url.origin === page.origin && url.pathname === page.pathname) || url.origin === 'https://challenges.cloudflare.com' || ['about:blank', 'about:srcdoc'].includes(request.url);
      } catch { return false; }
    }}
    onMessage={({ nativeEvent }) => {
      if (completed.current) return;
      try {
        const url = new URL(nativeEvent.url);
        if (url.origin !== page.origin || url.pathname !== page.pathname) return;
        const message = JSON.parse(nativeEvent.data);
        if (message.type === 'captcha-token' && typeof message.token === 'string' && message.token.length <= 2048) {
          completed.current = true; onToken(message.token);
        } else if (message.type === 'captcha-error') onError('Verification failed. Close the challenge and try again.');
      } catch { /* Ignore messages unrelated to the verification bridge. */ }
    }}
    onError={() => onError('The challenge could not load. Check your connection and try again.')}
    onHttpError={() => onError('The challenge is unavailable. Close it and try again.')}
  />;
}
