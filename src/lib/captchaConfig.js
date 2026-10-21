export const captchaSiteKey = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY?.trim() || '';

export function nativeCaptchaUrl() {
  const value = process.env.EXPO_PUBLIC_SITE_URL?.trim();
  let url;
  try { url = new URL(value); } catch { throw new Error('Bot verification is not configured. Please contact the site administrator.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Bot verification requires the deployed website address. Please contact the site administrator.');
  }
  return `${url.origin}/captcha.html?sitekey=${encodeURIComponent(captchaSiteKey)}`;
}
