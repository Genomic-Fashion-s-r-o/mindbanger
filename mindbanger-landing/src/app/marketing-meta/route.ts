import { randomBytes } from 'node:crypto';
import { META_PIXEL_ID } from '@/lib/marketing';

export const dynamic = 'force-dynamic';

// A sandboxed disposable document cannot inspect the parent URL, forms or DOM.
// Only the generic home-page visit is supported; no booking/purchase events.
export function GET() {
  const nonce = randomBytes(18).toString('base64');
  const script = `
    let initialized=false;
    addEventListener('message',event=>{
      if(initialized || event.source!==parent || !['https://www.mindbanger.com','https://mindbanger.com'].includes(event.origin)) return;
      if(event.data?.type!=='mindbanger-meta-init' || event.data?.page!=='home') return;
      initialized=true;
      // Meta's supplied base snippet includes this image endpoint. Instantiate
      // it only after consent, rather than running their DOM-reading JS SDK.
      const pixel=document.createElement('img');
      pixel.width=1;pixel.height=1;pixel.alt='';pixel.referrerPolicy='no-referrer';
      const target=new URL('https://www.facebook.com/tr');
      target.searchParams.set('id',${JSON.stringify(META_PIXEL_ID)});
      target.searchParams.set('ev','PageView');
      target.searchParams.set('noscript','1');
      target.searchParams.set('dl','https://www.mindbanger.com/');
      pixel.src=target.href;document.body.appendChild(pixel);
    });`;
  return new Response(`<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Mindbanger</title></head><body><script nonce="${nonce}">${script}</script></body></html>`, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; img-src https://www.facebook.com; frame-ancestors 'self'; base-uri 'none'; form-action 'none'; sandbox allow-scripts`,
    },
  });
}
