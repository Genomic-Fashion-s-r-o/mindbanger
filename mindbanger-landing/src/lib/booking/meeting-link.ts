// Shared strict allowlist. Host start URLs and arbitrary external links are never client links.
export function meetingProvider(url:string|null|undefined):'Zoom'|'Google Meet'|null {
  if(!url)return null;
  try{const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)return null;
    if(u.hostname==='meet.google.com'&&/^\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(u.pathname)&&!u.search)return 'Google Meet';
    if((u.hostname==='zoom.us'||/^[a-z0-9-]+\.zoom\.us$/.test(u.hostname))&&/^\/j\/\d{9,12}$/.test(u.pathname)&&[...u.searchParams.keys()].every(k=>k==='pwd')&&u.searchParams.getAll('pwd').length<=1&&(!u.search||/^[A-Za-z0-9._~-]{1,255}$/.test(u.searchParams.get('pwd')||'')))return 'Zoom';
  }catch{/* Untrusted URLs remain unusable. */}return null;
}
export const meetingName=(url?:string|null)=>meetingProvider(url)||'online videohovor';
