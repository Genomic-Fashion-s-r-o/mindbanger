'use client';
import PortalElement from '@/components/client/PortalElement';
import { QuestionnaireFields } from './QuestionnaireFields';
import type { QuestionField } from '@/lib/coaching-cards-model';
import { useEffect, useState } from 'react';
import { TEEN_NOTICE_VERSION } from '@/lib/coaching-cards-model';
import '@/components/admin/coaching-cards.css';
type Form = {
    title: string;
    text: string;
    questions: string[];
    answers?: string[];
    respondent?: string;
    questionLayout?: QuestionField[];
    healthAllowed?: boolean;
    notice: string;
    noticeVersion: string;
    expires: string;
};
export default function TeenQuestionnaire() {
    const [token, setToken] = useState(''), [form, setForm] = useState<Form | null>(null), [answers, setAnswers] = useState<string[]>([]), [healthAccepted, setHealthAccepted] = useState(false), [accepted, setAccepted] = useState(false), [error, setError] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [done, setDone] = useState(false);
    useEffect(() => { const value = new URLSearchParams(window.location.hash.slice(1)).get('token') || '', abort = new AbortController(); setToken(value); if (!/^[a-f0-9]{64}$/.test(value)) {
        setError('Otvor, prosím, celý odkaz z emailu od kouča.');
        setLoading(false);
        return;
    } void (async () => { try {
        const r = await fetch('/api/coaching/teen-questionnaire', { method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'open', token: value }), signal: abort.signal }), b = await r.json();
        if (!r.ok)
            throw Error(b.error);
        if (!abort.signal.aborted) {
            setForm(b.form);
            setAnswers(b.form.questions.map((_: string, i: number) => b.form.answers?.[i] || ''));
        }
    }
    catch (e) {
        if (!abort.signal.aborted)
            setError((e as Error).message);
    }
    finally {
        if (!abort.signal.aborted)
            setLoading(false);
    } })(); return () => abort.abort(); }, []);
    return <PortalElement as="div" className="teen-public-shell"><PortalElement as="main" className="coaching-cards teen-questionnaire-page"><PortalElement as="p">MINDBANGER · TVOJ DOBROVOĽNÝ DOTAZNÍK</PortalElement>{done ? <PortalElement as="section" className="cards-panel" role="status"><PortalElement as="h1">Ďakujem za tvoje odpovede.</PortalElement><PortalElement as="p">Sú bezpečne uložené koučovi. V rodičovskom účte sa nezobrazia a rodičovi ich automaticky nepošleme.</PortalElement><PortalElement as="p">Ak sa chceš na niečo opýtať alebo odvolať súhlas s odpoveďami, napíš na <PortalElement as="a" href="mailto:miroslav@mindbanger.com">miroslav@mindbanger.com</PortalElement>.</PortalElement></PortalElement> : <>{loading ? <PortalElement as="p">Načítavam tvoj dotazník…</PortalElement> : form && <><PortalElement as="h1">{form.title}</PortalElement><PortalElement as="aside" className="cards-notice"><PortalElement as="h2">Tvoje súkromie</PortalElement><PortalElement as="p">{form.notice}</PortalElement></PortalElement><PortalElement as="p" className="cards-text">{form.text.startsWith(form.notice) ? form.text.slice(form.notice.length).trim() : form.text}</PortalElement><PortalElement as="p">Všetky otázky sú nepovinné a môžeš odoslať aj neúplný dotazník. Odpovedaj iba vtedy, keď chceš. Nemusíš pokračovať a nič sa priebežne neukladá. Ak dotazník nechceš vyplniť, môžeš okno zavrieť.</PortalElement><PortalElement as="form" className="cards-panel" onSubmit={e => { e.preventDefault(); if (busy || !accepted)
        return; setBusy(true); setError(''); void (async () => { try {
        const r = await fetch('/api/coaching/teen-questionnaire', { method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'submit', token, answers, healthAccepted, accepted: true, noticeVersion: TEEN_NOTICE_VERSION }) }), b = await r.json();
        if (!r.ok)
            throw Error(b.error);
        setDone(true);
        setForm(null);
        setAnswers([]);
        setToken('');
        window.history.replaceState(null, '', window.location.pathname);
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } })(); }}><QuestionnaireFields basic={form.respondent ? <PortalElement as="p">Dotazník pre: <PortalElement as="strong">{form.respondent}</PortalElement></PortalElement> : undefined} content={{ questions: form.questions, questionLayout: form.questionLayout || [] }} answers={answers} sensitiveAllowed={form.healthAllowed && healthAccepted} sensitiveConsent={form.questionLayout?.some(f => f.sensitive) && <PortalElement as="aside" className="questionnaire-section"><PortalElement as="h3">Nepovinné citlivé otázky</PortalElement>{form.healthAllowed ? <PortalElement as="label" className="cards-check"><PortalElement as="input" type="checkbox" checked={healthAccepted} onChange={e => { setHealthAccepted(e.target.checked); if (!e.target.checked)
        setAnswers(a => a.map((v, i) => form.questionLayout?.[i]?.sensitive ? '' : v)); }}/><PortalElement as="span">Chcem dobrovoľne odpovedať aj na citlivé otázky a výslovne súhlasím s uložením týchto odpovedí o mojom zdraví a bezpečí pre koučingovú spoluprácu. Číta ich iba kouč; rodič ich vo svojom účte neuvidí. Súhlas môžem odvolať na miroslav@mindbanger.com.</PortalElement></PortalElement> : <PortalElement as="p">Citlivé otázky zatiaľ necháme na osobný rozhovor. Ich písomné spracovanie musí osobitne povoliť zákonný zástupca; tvoje dobrovoľné rozhodnutie je potrebné tiež.</PortalElement>}</PortalElement>} onChange={(i, value) => setAnswers(a => a.map((v, j) => j === i ? value : v))}/><PortalElement as="label" className="cards-check"><PortalElement as="input" type="checkbox" required checked={accepted} onChange={e => setAccepted(e.target.checked)}/><PortalElement as="span">Chcem svoje odpovede dobrovoľne odoslať koučovi a súhlasím s ich uložením na účely našej spolupráce. Rozumiem vyššie uvedeným pravidlám súkromia a tomu, že môžem požiadať o vymazanie alebo odvolať tento súhlas na miroslav@mindbanger.com. Neuvádzam zdravotnú dokumentáciu ani nepotrebné údaje iných ľudí.</PortalElement></PortalElement><PortalElement as="button" className="cards-primary" disabled={busy || !accepted}>{busy ? 'Ukladám…' : 'Odoslať odpovede iba koučovi'}</PortalElement></PortalElement><PortalElement as="p" className="cards-muted">Odkaz je súkromný, platí najviac 7 dní a po odoslaní odpovedí ho nemožno použiť znova. Nepreposielaj ho.</PortalElement></>}{error && <PortalElement as="p" className="cards-error" role="alert">{error}</PortalElement>}</>}<PortalElement as="p"><PortalElement as="a" href="mailto:miroslav@mindbanger.com">Napísať koučovi</PortalElement> · <PortalElement as="a" href="/ochrana-udajov" target="_blank" rel="noopener noreferrer">Ochrana údajov</PortalElement></PortalElement></PortalElement></PortalElement>;
}
