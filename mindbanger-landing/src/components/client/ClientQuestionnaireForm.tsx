'use client';
import PortalElement from '@/components/client/PortalElement';
import { useEffect, useRef, useState } from 'react';
import { CARD_CONSENT, isParentForm, type CardRecord } from '@/lib/coaching-cards-model';
import { QUESTIONNAIRE_ACK } from '@/lib/coaching-questionnaires';
import { validateQuestionnaireAnswers } from '@/lib/coaching-questionnaire-layout';
import { QuestionnaireFields } from './QuestionnaireFields';
export default function ClientQuestionnaireForm({ record, onSubmitted, onClose }: {
    record: CardRecord;
    onSubmitted: () => Promise<void>;
    onClose: () => void;
}) {
    const c = record.content, parent = isParentForm(c.formType), guardian = c.answerMode === 'acknowledgements';
    const [answers, setAnswers] = useState(c.questions.map((_, i) => guardian ? '' : c.answers[i] || '')), [name, setName] = useState(c.respondent), [child, setChild] = useState(c.childName), [age, setAge] = useState(c.childAge ? String(c.childAge) : ''), [healthAccepted, setHealthAccepted] = useState(false), [accepted, setAccepted] = useState(false), [direct, setDirect] = useState(false), [teenEmail, setTeenEmail] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const alert = useRef<HTMLDivElement>(null);
    useEffect(() => { if (error)
        alert.current?.focus(); }, [error]);
    const change = (i: number, value: string) => setAnswers(a => a.map((v, j) => j === i ? value : v));
    const basic = <><PortalElement as="p" className="questionnaire-help">Dostupné údaje sú predvyplnené z rezervácie alebo účtu. Môžeš ich skontrolovať a upraviť.</PortalElement>{c.respondentEmail && <PortalElement as="p">Email: {c.respondentEmail}</PortalElement>}<PortalElement as="label">{parent ? 'Meno zákonného zástupcu' : 'Tvoje meno a priezvisko'}<PortalElement as="input" required={guardian} autoComplete="name" maxLength={120} value={name} onChange={e => setName(e.target.value)}/></PortalElement>{parent && <><PortalElement as="label">Meno dieťaťa<PortalElement as="input" required={guardian} maxLength={120} value={child} onChange={e => setChild(e.target.value)}/></PortalElement><PortalElement as="label">Vek dieťaťa<PortalElement as="input" required={guardian} type="number" min={13} max={17} value={age} onChange={e => setAge(e.target.value)}/></PortalElement><PortalElement as="p" className="questionnaire-help">Vypĺňa rodič alebo zákonný zástupca teenagera od 13 rokov do dovŕšenia 18 rokov.</PortalElement></>}</>;
    const healthFields = c.questionLayout.some(f => f.sensitive);
    const sensitiveConsent = healthFields && <PortalElement as="aside" className="questionnaire-section"><PortalElement as="h3">Citlivé bezpečnostné otázky sú nepovinné</PortalElement><PortalElement as="p">Môžeš ich nechať na osobný rozhovor. Bez tohto osobitného súhlasu sa ich odpovede nezbierajú.</PortalElement><PortalElement as="label" className="cards-check"><PortalElement as="input" type="checkbox" checked={healthAccepted} onChange={e => { setHealthAccepted(e.target.checked); if (!e.target.checked)
        setAnswers(a => a.map((v, i) => c.questionLayout[i]?.sensitive ? '' : v)); }}/><PortalElement as="span">Chcem dobrovoľne vyplniť aj citlivé otázky a výslovne súhlasím so spracovaním uvedených údajov o zdraví a bezpečí {parent ? 'môjho dieťaťa' : 'o mne'} na prípravu a bezpečné vedenie koučingovej spolupráce. Uložia sa šifrovane v karte klienta; prístup má kouč{parent ? ' a môj rodičovský účet' : ' a môj účet'}. {parent ? 'Ako zákonný zástupca tým povoľujem aj písomné spracovanie dobrovoľných citlivých odpovedí teenagera v jeho samostatnom dotazníku; tie zostávajú iba koučovi. ' : ''}Súhlas môžem odvolať na miroslav@mindbanger.com.</PortalElement></PortalElement></PortalElement>;
    return <PortalElement as="form" onSubmit={e => { e.preventDefault(); if (busy || !accepted)
        return; setError(''); try {
        validateQuestionnaireAnswers(c, answers);
    }
    catch (e) {
        setError((e as Error).message);
        return;
    } setBusy(true); void (async () => { try {
        const r = await fetch('/api/client/coaching-card', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: record.id, revision: record.revision, answers, respondent: name, childName: parent ? child : '', childAge: parent ? Number(age) : 0, teenEmail: parent && direct ? teenEmail : '', directTeenCommunication: parent && direct, healthAccepted, accepted, consentVersion: CARD_CONSENT }) }), b = await r.json();
        if (!r.ok)
            throw Error(b.error || 'Odpovede sa nepodarilo odoslať.');
        await onSubmitted();
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } })(); }}>{error && <PortalElement as="div" className="cards-error" role="alert" tabIndex={-1} ref={alert}><PortalElement as="strong">Odpovede ešte neboli potvrdené.</PortalElement><PortalElement as="p">{error}</PortalElement></PortalElement>}{c.answerMode === 'acknowledgements' ? <><PortalElement as="fieldset" className="questionnaire-section"><PortalElement as="legend">A. Základné údaje</PortalElement>{basic}</PortalElement><PortalElement as="fieldset" className="questionnaire-section"><PortalElement as="legend">B. Jednotlivé súhlasy</PortalElement>{c.questions.map((q, i) => <PortalElement as="label" key={i} className="cards-check"><PortalElement as="input" type="checkbox" required checked={answers[i] === QUESTIONNAIRE_ACK} onChange={e => change(i, e.target.checked ? QUESTIONNAIRE_ACK : '')}/><PortalElement as="span">{q}</PortalElement></PortalElement>)}</PortalElement></> : <QuestionnaireFields content={c} answers={answers} onChange={change} basic={basic} sensitiveAllowed={healthAccepted} sensitiveConsent={sensitiveConsent}/>}{parent && <PortalElement as="fieldset" className="questionnaire-section"><PortalElement as="legend">Priamy kontakt s teenagerom (nepovinné)</PortalElement><PortalElement as="p">Ak povolíš priamy kontakt, kouč môže teenagerovi ručne poslať jeho samostatný dotazník. Odpovede teenagera číta iba kouč; v rodičovskom účte sa nezobrazujú ani sa rodičovi automaticky nepreposielajú. Hranice dôvernosti dohodneme pri prvom stretnutí.</PortalElement><PortalElement as="label" className="cards-check"><PortalElement as="input" type="checkbox" checked={direct} onChange={e => setDirect(e.target.checked)}/><PortalElement as="span">Povoľujem priamu emailovú komunikáciu kouča s teenagerom na uvedenom emaile. Povolenie môžem odvolať v účte alebo na miroslav@mindbanger.com. Odmietnutie nemá vplyv na možnosť dohodnúť koučing.</PortalElement></PortalElement>{direct && <PortalElement as="label">Email teenagera<PortalElement as="input" type="email" required autoComplete="off" maxLength={254} value={teenEmail} onChange={e => setTeenEmail(e.target.value)}/></PortalElement>}</PortalElement>}<PortalElement as="section" className="questionnaire-submit"><PortalElement as="h3">Skontroluj a odošli odpovede</PortalElement>{!guardian && <PortalElement as="p">Všetky otázky sú nepovinné. Dotazník môžeš odoslať aj s prázdnymi odpoveďami a zvyšok preberieme osobne.</PortalElement>}<PortalElement as="p">Dátum vyplnenia sa uloží automaticky pri odoslaní. Odpovede sa neposielajú emailom; zostanú bezpečne uložené v karte klienta.</PortalElement><PortalElement as="label" className="cards-check"><PortalElement as="input" type="checkbox" required checked={accepted} onChange={e => setAccepted(e.target.checked)}/><PortalElement as="span">Potvrdzujem svoje odpovede a súhlasím s ich uložením pre účely našej spolupráce. O odvolanie súhlasu alebo vymazanie môžem požiadať na miroslav@mindbanger.com.{parent && ' Potvrdzujem, že som zákonný zástupca uvedeného dieťaťa.'}</PortalElement></PortalElement><PortalElement as="div" className="cards-actions"><PortalElement as="button" className="cards-primary" disabled={busy || !accepted}>{busy ? 'Bezpečne ukladám odpovede…' : c.formType === 'guardian' ? 'Potvrdiť súhlas zákonného zástupcu' : 'Odoslať dotazník'}</PortalElement><PortalElement as="button" type="button" disabled={busy} onClick={onClose}>Zavrieť bez odoslania</PortalElement></PortalElement>{!accepted && <PortalElement as="p" className="questionnaire-help">Pred odoslaním potvrď súhlas s uložením odpovedí.</PortalElement>}</PortalElement></PortalElement>;
}
