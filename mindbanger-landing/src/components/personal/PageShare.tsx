'use client';
import PortalElement from '@/components/client/PortalElement';
import { useId, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Copy, MessageCircle, Send, Share2 } from 'lucide-react';
import { publicShareUrl, smsShareUrl, whatsappShareUrl } from '@/lib/public-share';
import './page-share.css';
export default function PageShare({ compact = false, compactLabel }: {
    compact?: boolean;
    compactLabel?: string;
}) {
    const pathname = usePathname();
    const url = publicShareUrl(pathname);
    return url ? <ShareControls key={url} url={url} compact={compact} compactLabel={compactLabel}/> : null;
}
function ShareControls({ url, compact, compactLabel }: {
    url: string;
    compact: boolean;
    compactLabel?: string;
}) {
    const cs = new URL(url).pathname === '/cz' || new URL(url).pathname.startsWith('/cz/');
    const c = (sk: string, cz: string) => cs ? cz : sk;
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState('');
    const [manualCopy, setManualCopy] = useState(false);
    const panelId = useId();
    const triggerRef = useRef<HTMLButtonElement>(null);
    const text = c('Pozri si túto stránku na Mindbanger: ', 'Podívej se na tuto stránku na Mindbanger: ') + url;
    async function share() {
        if (busy || !url)
            return;
        setStatus('');
        if (!navigator.share) {
            setOpen(true);
            if (!compact)
                setStatus(c('Vyber WhatsApp alebo SMS, prípadne skopíruj odkaz do svojej obľúbenej aplikácie.', 'Vyber WhatsApp nebo SMS, případně zkopíruj odkaz do své oblíbené aplikace.'));
            return;
        }
        setBusy(true);
        try {
            // Keep this call directly in the click event: native sharing requires user activation.
            await navigator.share({ title: document.title, url });
        }
        catch (error) {
            if (!(error instanceof Error && error.name === 'AbortError')) {
                setOpen(true);
                setStatus(c('Ponuka zdieľania tu nie je dostupná. Použi WhatsApp, SMS alebo skopíruj odkaz.', 'Nabídka sdílení zde není dostupná. Použij WhatsApp, SMS nebo zkopíruj odkaz.'));
            }
        }
        finally {
            setBusy(false);
        }
    }
    async function copy() {
        if (!url)
            return;
        try {
            if (!navigator.clipboard?.writeText)
                throw new Error('Clipboard unavailable');
            await navigator.clipboard.writeText(url);
            setManualCopy(false);
            setStatus(c('Odkaz je skopírovaný. Vlož ho do správy v Messengeri, Instagrame alebo inom chate.', 'Odkaz je zkopírovaný. Vlož ho do zprávy v Messengeru, Instagramu nebo jiném chatu.'));
        }
        catch {
            setManualCopy(true);
            setStatus(c('Označ odkaz nižšie a skopíruj ho do správy.', 'Označ odkaz níže a zkopíruj ho do zprávy.'));
        }
    }
    const options = <>
    <PortalElement as="div" className="page-share-options">
      {!compact && <PortalElement as="button" type="button" className="page-share-primary" onClick={share} disabled={busy}><Share2 size={19} aria-hidden="true"/>{c('Poslať do správy', 'Poslat do zprávy')}</PortalElement>}
      <PortalElement as="a" href={whatsappShareUrl(text)} target="_blank" rel="noopener noreferrer"><MessageCircle size={19} aria-hidden="true"/>WhatsApp</PortalElement>
      <PortalElement as="a" href={smsShareUrl(text)} onClick={event => {
            if (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
                event.currentTarget.href = smsShareUrl(text, true);
        }}><Send size={18} aria-hidden="true"/>SMS</PortalElement>
      <PortalElement as="button" type="button" onClick={copy}><Copy size={18} aria-hidden="true"/>{c('Kopírovať odkaz', 'Kopírovat odkaz')}</PortalElement>
    </PortalElement>
    <PortalElement as="p" className="page-share-hint">{c('Messenger či Instagram vyber v ponuke telefónu alebo do správy vlož skopírovaný odkaz.', 'Messenger nebo Instagram vyber v nabídce telefonu, případně do zprávy vlož zkopírovaný odkaz.')}</PortalElement>
    {manualCopy && <PortalElement as="label" className="page-share-manual">{c('Odkaz na túto stránku', 'Odkaz na tuto stránku')}<PortalElement as="input" type="text" value={url} readOnly onFocus={event => event.currentTarget.select()}/></PortalElement>}
  </>;
    if (compact)
        return <PortalElement as="div" className="page-share-compact">
    <PortalElement as="button" ref={triggerRef} type="button" className="page-share-trigger" onClick={share} disabled={busy} aria-label={c('Zdieľať túto stránku', 'Sdílet tuto stránku')} aria-expanded={open} aria-controls={open ? panelId : undefined}><Share2 size={20} aria-hidden="true"/><PortalElement as="span">{compactLabel ?? c('Zdieľať', 'Sdílet')}</PortalElement></PortalElement>
    {open && <PortalElement as="div" id={panelId} className="page-share-popover" role="region" aria-label={c('Možnosti zdieľania', 'Možnosti sdílení')} onKeyDown={event => { if (event.key === 'Escape') {
            setOpen(false);
            triggerRef.current?.focus();
        } }}><PortalElement as="div" className="page-share-popover-heading"><PortalElement as="strong">{c('Pošli odkaz ďalej', 'Pošli odkaz dál')}</PortalElement><PortalElement as="button" type="button" onClick={() => { setOpen(false); triggerRef.current?.focus(); }} aria-label={c('Zavrieť možnosti zdieľania', 'Zavřít možnosti sdílení')}>×</PortalElement></PortalElement>{options}<PortalElement as="p" role="status" className="page-share-status">{status}</PortalElement></PortalElement>}
  </PortalElement>;
    return <PortalElement as="aside" className="page-share-panel" aria-label={c('Zdieľanie stránky', 'Sdílení stránky')}><PortalElement as="div"><PortalElement as="span" className="page-share-eyebrow">{c('NIEKEDY POMÔŽE AJ JEDEN ODKAZ', 'NĚKDY POMŮŽE I JEDEN ODKAZ')}</PortalElement><PortalElement as="h2">{c('Poznáš niekoho, komu by to mohlo pomôcť?', 'Znáš někoho, komu by to mohlo pomoci?')}</PortalElement><PortalElement as="p">{c('Pošli mu túto stránku. Možno práve hľadá svoj ďalší krok.', 'Pošli mu tuto stránku. Možná právě hledá svůj další krok.')}</PortalElement></PortalElement><PortalElement as="div">{options}<PortalElement as="p" role="status" className="page-share-status">{status}</PortalElement></PortalElement></PortalElement>;
}
