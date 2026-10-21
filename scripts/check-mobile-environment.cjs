for (const name of ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_SITE_URL']) {
  const value = process.env[name]?.trim();
  let url;
  try { url = new URL(value); } catch {}
  if (!url || url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`Set ${name} to your deployed HTTPS origin in Expo's Production environment.`);
  }
}
if (!/^[a-zA-Z0-9_-]{10,100}$/.test(process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY?.trim() || '')) {
  throw new Error("Set EXPO_PUBLIC_TURNSTILE_SITE_KEY in Expo's Production environment.");
}
console.log('Mobile release environment is configured.');
