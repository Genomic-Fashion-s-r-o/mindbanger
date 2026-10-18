import assert from 'node:assert/strict';
const origin = process.env.BOOKING_TEST_ORIGIN || 'http://localhost:3100';
const routes = ['/', '/rezervacia', '/podmienky', '/ochrana-udajov', '/cookies', '/mindbanger_daily', '/robots.txt', '/sitemap.xml'];
for (const path of routes) {
  const response = await fetch(origin + path);
  const body = await response.text();
  assert.equal(response.status, 200, path);
  if (path === '/') {
    assert.ok(body.includes('Miroslav Jobus'));
    assert.ok(!/<a[^>]+href="\/(?:mindbanger_daily|mindbanger|app|join|login|b2b)(?:["/])/i.test(body), 'Personal page must not link to the hidden product');
    assert.ok(!response.headers.get('set-cookie'), 'Personal site must not set the product language cookie');
    console.log('OG image:', body.match(/property="og:image" content="([^"]+)/)?.[1]);
  }
  if (path === '/mindbanger_daily') assert.ok(response.headers.get('x-robots-tag')?.includes('noindex'));
  if (path === '/sitemap.xml') assert.ok(!body.includes('/mindbanger') && !body.includes('/app/'));
  console.log('PASS', path);
}
const admin = await fetch(origin + '/api/admin/appointments?day=2026-10-08');
assert.equal(admin.status, 401);
assert.ok(!(await admin.text()).includes('customer_name'));
assert.equal((await fetch(origin + '/api/cron/appointments')).status, 401);
assert.equal((await fetch(origin + '/api/appointments', { method:'POST', headers:{'Content-Type':'application/json','Origin':'https://untrusted.example'}, body:'{}' })).status, 403);
assert.equal((await fetch(origin + '/api/appointments/manage', { method:'POST', headers:{'Content-Type':'application/json','Origin':origin}, body:JSON.stringify({token:'invalid',action:'view'}) })).status, 400);
console.log('PASS unauthorized admin, cron, cross-origin mutation and invalid management token');
// In an unconfigured preview the calendar must fail closed, never accept requests.
if (process.env.BOOKING_EXPECT_DISABLED === '1') {
  assert.equal((await fetch(origin + '/api/appointments?service=uvodne-stretnutie&day=2026-10-08')).status, 503);
  console.log('PASS closed public calendar without setup');
}
