'use client';
import PortalElement from '@/components/client/PortalElement';
import { useRef } from 'react';
import Link from '@/components/client/PortalLink';
import '@/components/programs/online-programs.css';
export default function BonusReader({ id, title, description, mime, fallback=false }: {
    id: string;
    title: string;
    description: string;
    mime: string;
    fallback?:boolean;
}) {
    const frame = useRef<HTMLIFrameElement>(null), src = '/api/client/member-materials/' + id + '/file';
    return <PortalElement as="div" className="op op-stack"><Link href="/ucet/materialy">← Moje materiály</Link><PortalElement as="header">{fallback&&<PortalElement as="p" className="op-notice">Obsah je zatiaľ dostupný v slovenčine.</PortalElement>}<PortalElement as="p" className="client-eyebrow">TVOJ MATERIÁL ZDARMA</PortalElement><PortalElement as="h1">{title}</PortalElement><PortalElement as="p" className="op-text">{description}</PortalElement></PortalElement>{mime === 'application/pdf' ? <><PortalElement as="div"><PortalElement as="button" type="button" onClick={() => frame.current?.contentWindow?.print()}>Tlačiť dokument</PortalElement></PortalElement><PortalElement as="iframe" ref={frame} src={src + '#toolbar=0&navpanes=0'} title={title} style={{ width: '100%', height: 'min(80vh,950px)', minHeight: 420, border: '1px solid #d5dece', borderRadius: 8, background: '#fff' }}/><PortalElement as="p" className="op-subtle">Dokument zostáva uložený v tvojom účte. Pre tlač môžeš použiť aj Ctrl+P po kliknutí do dokumentu.</PortalElement></> : mime.startsWith('audio/') ? <PortalElement as="audio" controls controlsList="nodownload" preload="metadata" src={src} aria-label={title}/> : <PortalElement as="video" controls controlsList="nodownload" playsInline preload="metadata" src={src} aria-label={title}/>}</PortalElement>;
}
