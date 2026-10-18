import assert from 'node:assert/strict';

const origin = process.env.BOOKING_TEST_ORIGIN || 'http://localhost:3100';
const prefix = '/mindbanger_daily';
for (const old of ['/mindbanger', '/app/today', '/app/archive/old-item', '/app/settings', '/admin/dashboard', '/admin/login', '/admin/rezervacie', '/about', '/terms', '/privacy', '/affiliate-terms', '/join', '/login', '/b2b/register', '/checkout', '/success', '/cancel', '/auth/callback']) {
  const response = await fetch(`${origin}${old}?migration=keep`, { redirect: 'manual' });
  assert.equal(response.status, 308, old);
  const target = new URL(response.headers.get('location'), origin);
  assert.equal(target.pathname, old === '/mindbanger' ? prefix : prefix + old, old);
  assert.equal(target.searchParams.get('migration'), 'keep', old);
}
for (const page of ['', '/login', '/join', '/about', '/terms', '/privacy', '/affiliate-terms', '/b2b', '/b2b/register', '/checkout', '/admin/login', '/auth/callback']) {
  const response = await fetch(origin + prefix + page);
  assert.equal(response.status, 200, page);
  assert.ok(response.headers.get('x-robots-tag')?.includes('noindex'), page);
  const html = await response.text();
  for (const link of html.matchAll(/href="(\/(?:app|login|join|b2b|checkout|terms|privacy|about|admin|mindbanger)(?:[/?#"][^"]*)?)"/g)) {
    assert.fail(`Unmigrated product link on ${page}: ${link[1]}`);
  }
}
for (const page of ['/app/today', '/app/archive', '/app/organization', '/admin/dashboard']) {
  const response = await fetch(origin + prefix + page);
  assert.equal(response.status, 200, page);
  assert.match(response.url, /\/mindbanger_daily\/(?:admin\/)?login/, page);
}
for (const query of ['ref=old-affiliate', 'refMode=A&refCode=affiliate']) {
  const response = await fetch(`${origin}/?${query}`, { redirect: 'manual' });
  const target = new URL(response.headers.get('location'), origin);
  assert.equal(target.pathname, prefix);
  assert.equal(target.search.slice(1), query);
}
const manifest = await (await fetch(origin + prefix + '/manifest.webmanifest')).json();
assert.equal(manifest.start_url, prefix + '/app/today');
assert.equal(manifest.scope, prefix + '/');
assert.equal((await fetch(origin + prefix + '/api/cron/appointments')).status, 401);
assert.equal((await fetch(origin + prefix + '/api/admin/appointments')).status, 401);
console.log('PASS Daily page migration, saved links, query preservation, login gates, referral links, PWA scope and protected API aliases.');
