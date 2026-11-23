'use client';
import {localeTag} from '@/lib/portal-locale';
import {usePortalLocale} from '@/components/client/PortalElement';
import PortalElement from '@/components/client/PortalElement';
import { useCallback, useEffect, useState } from 'react';
import { isParentForm, type CardRecord } from '@/lib/coaching-cards-model';
import { dateLabel } from '@/lib/booking/model';
import { QuestionnaireAnswers } from './QuestionnaireFields';
import ClientQuestionnaireForm from './ClientQuestionnaireForm';
import '@/components/admin/coaching-cards.css';
export default function CoachingCard() {
    const portalLanguage = usePortalLocale();
    const [page, setPage] = useState(0), [records, setRecords] = useState<CardRecord[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [active, setActive] = useState(''), [notice, setNotice] = useState('');
    const load = useCallback(async () => {
        const target = new URLSearchParams(window.location.search).get('dotaznik');
        const r = await fetch('/api/client/coaching-card?' + (target ? 'dotaznik=' + encodeURIComponent(target) : 'offset=' + page * 20), { cache: 'no-store' }), b = await r.json();
        if (!r.ok)
            throw Error(b.error || 'Dotazník sa nepodarilo načítať.');
        setRecords(b.records);
        const selected = b.records.find((r: CardRecord) => r.id === target && r.kind === 'questionnaire' && r.state === 'assigned');
        if (selected)
            setActive(selected.id);
    }, [page]);
    useEffect(() => { void load().catch(e => setError(e.message)).finally(() => setLoading(false)); }, [load]);
    return <PortalElement as="div" className="coaching-cards"><PortalElement as="header" className="questionnaire-intro"><PortalElement as="p">MINDBANGER · ONLINE DOTAZNÍKY</PortalElement>{records.length !== 1 && <PortalElement as="h1">Dokumenty a dotazníky</PortalElement>}<PortalElement as="p">Dotazník vyplníš priamo tu na webe. Po kliknutí na „Odoslať dotazník“ uvidíš potvrdenie uloženia. Na email netreba odpovedať.</PortalElement></PortalElement>{error && <PortalElement as="p" className="cards-error" role="alert">{error}</PortalElement>}{notice && <PortalElement as="section" className="questionnaire-success" role="status"><PortalElement as="h2">Potvrdenie</PortalElement><PortalElement as="p">{notice}</PortalElement></PortalElement>}{loading ? <PortalElement as="p">Načítavam…</PortalElement> : !records.length ? <PortalElement as="p">Zatiaľ nemáš pridelený dotazník ani sprístupnený dokument.</PortalElement> : records.map(r => <PortalElement as="article" className="cards-panel" key={r.id}><PortalElement as="header" className="questionnaire-intro"><PortalElement as="p" className="cards-status">{r.state === 'answered' ? '✓ VYPLNENÉ A ULOŽENÉ' : r.kind === 'questionnaire' ? 'NA VYPLNENIE' : 'OD TVOJHO KOUČA'}</PortalElement>{records.length === 1 && r.kind === 'questionnaire' ? <PortalElement as="h1">{r.content.title}</PortalElement> : <PortalElement as="h2">{r.content.title}</PortalElement>}{r.kind === 'questionnaire' && r.state === 'assigned' && <PortalElement as="p">{r.content.answerMode === 'acknowledgements' ? 'Prečítaj a potvrď jednotlivé body súhlasu.' : 'Odpovedaj vlastnými slovami a vo svojom tempe. Všetky otázky dotazníka sú nepovinné; môžeš ho odoslať aj neúplný.'}</PortalElement>}{r.content.text && (r.kind === 'questionnaire' ? <><PortalElement as="p">{r.content.text.split(/(?<=[.!?])\s+/)[0]}</PortalElement><PortalElement as="details" className="questionnaire-instructions"><PortalElement as="summary">Pokyny a súkromie pred vyplnením</PortalElement><PortalElement as="p" className="cards-text">{r.content.text}</PortalElement></PortalElement>{r.content.questionLayout.some(f => f.sensitive) && <PortalElement as="p" className="questionnaire-help">Dotazník nie je krízový komunikačný kanál a nie je sledovaný nepretržite. Citlivé odpovede sú nepovinné.</PortalElement>}</> : <PortalElement as="p" className="cards-text">{r.content.text}</PortalElement>)}</PortalElement>{r.kind === 'file' && <PortalElement as="a" className="cards-button" href={'/api/client/coaching-card?file=' + r.id}>Stiahnuť {r.content.filename}</PortalElement>}{r.kind === 'questionnaire' && r.state === 'assigned' && active !== r.id && <PortalElement as="button" className="cards-primary" onClick={() => { setActive(r.id); setNotice(''); }}>Vyplniť online dotazník</PortalElement>}{r.state === 'answered' && <><QuestionnaireAnswers content={r.content}/><PortalElement as="p" className="cards-muted">Odoslané {dateLabel(r.content.answeredAt, portalLanguage)} · Verzia {r.content.templateVersion || 'Individuálne znenie'}</PortalElement></>}{r.state === 'answered' && isParentForm(r.content.formType) && r.content.directTeenCommunication && <PortalElement as="div" className="cards-notice"><PortalElement as="p">Priama komunikácia s teenagerom: {r.teen_permission_revoked_at ? 'povolenie odvolané' : 'povolená'} · {r.content.teenEmail}. Jeho samostatné odpovede sa v tomto účte nezobrazujú.</PortalElement>{!r.teen_permission_revoked_at && <PortalElement as="button" disabled={busy} onClick={() => {
                        setBusy(true);
                        void (async () => {
                            try {
                                const result = await fetch('/api/client/coaching-card', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'revoke_teen_contact', id: r.id, revision: r.revision }) }), b = await result.json();
                                if (!result.ok)
                                    throw Error(b.error);
                                await load();
                                setNotice('Povolenie priamej komunikácie je odvolané. Nevyplnené odkazy z tohto povolenia už nebudú fungovať.');
                            }
                            catch (e) {
                                setError((e as Error).message);
                            }
                            finally {
                                setBusy(false);
                            }
                        })();
                    }}>Odvolať povolenie priamej komunikácie</PortalElement>}</PortalElement>}{active === r.id && r.state === 'assigned' && <ClientQuestionnaireForm key={r.id + ':' + r.revision} record={r} onClose={() => setActive('')} onSubmitted={async () => { setActive(''); await load(); setNotice('Ďakujem, dotazník je odoslaný a bezpečne uložený. Kouč má odpovede v tvojej karte a v administrácii nové upozornenie. Kópiu svojich odpovedí nájdeš nižšie.'); }}/>}</PortalElement>)}<PortalElement as="div" className="cards-actions"><PortalElement as="button" disabled={busy || !page} onClick={() => setPage(p => p - 1)}>Novšie položky</PortalElement><PortalElement as="span">Strana {page + 1}</PortalElement><PortalElement as="button" disabled={busy || records.length < 20} onClick={() => setPage(p => p + 1)}>Staršie položky</PortalElement></PortalElement><PortalElement as="p">Otázky alebo odvolanie súhlasu: <PortalElement as="a" href="mailto:miroslav@mindbanger.com">miroslav@mindbanger.com</PortalElement> · <PortalElement as="a" href="/ochrana-udajov">Ochrana údajov</PortalElement></PortalElement></PortalElement>;
}
