const PUBLIC_ORIGIN = 'https://www.mindbanger.com';

export function publicShareUrl(pathname: string): string | null {
  // Share only public presentation pages, never account, booking or verification links.
  const path = pathname.split(/[?#]/, 1)[0];
  const bare = path.replace(/^\/cz(?=\/|$)/, '') || '/';
  if (bare === '/' || /^\/sluzby\/[a-z0-9-]+$/.test(bare) || bare === '/produkty/chut-na-sladke') {
    return PUBLIC_ORIGIN + path;
  }
  return null;
}

export function whatsappShareUrl(text: string): string {
  return 'https://wa.me/?text=' + encodeURIComponent(text);
}

export function smsShareUrl(text: string, apple = false): string {
  return (apple ? 'sms:&body=' : 'sms:?body=') + encodeURIComponent(text);
}
