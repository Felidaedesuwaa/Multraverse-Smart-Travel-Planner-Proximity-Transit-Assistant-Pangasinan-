// Compatibility entry point; previews are shared by Android, iOS, and web.
process.argv.push('--web-only');
require('./start-mobile-preview.cjs');
