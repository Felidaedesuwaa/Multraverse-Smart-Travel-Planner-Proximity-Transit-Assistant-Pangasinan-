// Social crawlers read the exported HTML without executing JavaScript.
const fs = require('node:fs');
const path = require('node:path');

const output = path.resolve(__dirname, '../dist');
const htmlPath = path.join(output, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const image = fs.readFileSync(path.join(output, 'multraverse-preview.png'));
if (image.toString('hex', 0, 8) !== '89504e470d0a1a0a' ||
    image.readUInt32BE(16) !== 1440 || image.readUInt32BE(20) !== 842) {
  throw new Error('Share-preview PNG must match the dimensions in public/index.html.');
}

// Prefer an explicit custom domain, then the stable Vercel production domain.
const explicit = process.env.EXPO_PUBLIC_SITE_URL?.trim();
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const site = explicit || (vercelHost ? `https://${vercelHost}` : null);
if (process.env.VERCEL === '1' && !site) {
  throw new Error('Set EXPO_PUBLIC_SITE_URL to your public website origin for link previews.');
}
if (site) {
  const url = new URL(site);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Share-preview site URL must be an HTTPS origin without a path, query, or credentials.');
  }
  html = html.replace(/((?:property|name)="(?:og:url|og:image|twitter:image)" content=")([^\"]+)(")/g,
    (_, prefix, value, suffix) => `${prefix}${new URL(value, url).href}${suffix}`);
  fs.writeFileSync(htmlPath, html);
}
console.log(`Share preview verified${site ? ` for ${new URL(site).origin}` : ' (local build; relative URLs)'}.`);
