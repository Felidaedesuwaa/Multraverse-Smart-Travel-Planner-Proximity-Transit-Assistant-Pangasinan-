// Run before the Vercel export so a missing API URL cannot ship silently.
if (process.env.VERCEL === '1') {
  const value = process.env.EXPO_PUBLIC_API_URL?.trim();
  let url;
  try { url = new URL(value); } catch { /* Report an actionable build error below. */ }
  if (!url || url.protocol !== 'https:' || url.username || url.password ||
      (url.pathname !== '/' && url.pathname !== '') || url.search || url.hash ||
      /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\])/.test(url.hostname)) {
    console.error('Set EXPO_PUBLIC_API_URL in the Vercel frontend project to the deployed HTTPS API origin (no /api path). Deploy server/ separately, then redeploy this website. See DEPLOYMENT.md.');
    process.exitCode = 1;
  }
}
