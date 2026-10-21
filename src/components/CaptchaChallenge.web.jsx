import { createElement, useEffect, useRef } from 'react';
import { captchaSiteKey } from '../lib/captchaConfig';

let scriptPromise;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    const timer = setTimeout(() => failed(), 20000);
    function failed() { clearTimeout(timer); script.remove(); scriptPromise = null; reject(new Error('The challenge could not load. Check your connection and try again.')); }
    script.onload = () => { clearTimeout(timer); window.turnstile ? resolve(window.turnstile) : failed(); };
    script.onerror = failed;
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export default function CaptchaChallenge({ onToken, onError }) {
  const container = useRef(null);
  const callbacks = useRef({ onToken, onError });
  callbacks.current = { onToken, onError };
  useEffect(() => {
    let active = true, widget;
    if (!captchaSiteKey) { callbacks.current.onError('Bot verification is not configured. Please contact the site administrator.'); return; }
    loadTurnstile().then(turnstile => {
      if (!active) return;
      widget = turnstile.render(container.current, {
        sitekey: captchaSiteKey, action: 'register', theme: 'auto', size: 'flexible',
        callback: token => active && callbacks.current.onToken(token),
        'error-callback': () => { if (active) callbacks.current.onError('Verification failed. Close the challenge and try again.'); return true; },
        'expired-callback': () => active && callbacks.current.onError('The challenge expired. Close it and try again.'),
        'timeout-callback': () => active && callbacks.current.onError('The challenge timed out. Close it and try again.'),
      });
    }).catch(error => { if (active) callbacks.current.onError(error.message); });
    return () => { active = false; if (widget !== undefined) window.turnstile?.remove(widget); };
  }, []);
  return createElement('div', { ref: container, style: { width: '100%', minHeight: 75 }, 'aria-label': 'Cloudflare bot verification' });
}
