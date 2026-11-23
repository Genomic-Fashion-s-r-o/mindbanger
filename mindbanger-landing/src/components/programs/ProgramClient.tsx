'use client';
import type{PortalLocale}from '@/lib/portal-locale';
import {localeTag} from '@/lib/portal-locale';
import {usePortalLocale} from '@/components/client/PortalElement';
import PortalElement from '@/components/client/PortalElement';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from '@/components/client/PortalLink';
import type { ClientProgramView } from '@/lib/online-programs/store';
import type { Answers, Block } from '@/lib/online-programs/model';
import './online-programs.css';
type LessonView = ClientProgramView['lessons'][number];
type SavedLesson = {
    answers: Answers;
    position: number;
    revision: number;
    privateRevision: number;
};
const dateText = (date: string,locale:PortalLocale='sk') => new Intl.DateTimeFormat(localeTag(locale), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'));
function availabilityText(lesson: LessonView,locale:PortalLocale='sk') {
    if (lesson.completedAt)
        return 'Dokončená';
    if (lesson.availability.available)
        return 'Dostupná';
    if (lesson.availability.reason === 'intro')
        return 'Najprv začni program v úvode';
    if (lesson.availability.date)
        return `Od ${dateText(lesson.availability.date,locale)} o 00:00`;
    return 'Najprv začni program';
}
export default function ProgramClient({ initial, preview = false }: {
    initial: ClientProgramView;
    preview?: boolean;
}) {
    const portalLanguage = usePortalLocale();
    const [view, setView] = useState(initial), [selected, setSelected] = useState<string>('intro'), [message, setMessage] = useState(''), [starting, setStarting] = useState(false);
    const flush = useRef<() => Promise<boolean>>(async () => true);
    const choose = async (id: string) => {
        if (id === selected)
            return;
        if (await flush.current()) {
            setMessage('');
            setSelected(id);
        }
    };
    useEffect(() => {
        if (preview)
            return;
        let stopped = false;
        const refresh = async () => {
            if (document.visibilityState !== 'visible')
                return;
            try {
                const response = await fetch(`/api/client/online-programs/${initial.id}`, { cache: 'no-store' });
                if (!response.ok) {
                    if (response.status === 403)
                        setMessage('Platnosť prístupu sa zmenila. Obnov stránku.');
                    return;
                }
                const fresh: ClientProgramView = await response.json();
                if (!stopped)
                    setView(current => ({ ...current, lessons: current.lessons.map(l => { const update = fresh.lessons.find(x => x.id === l.id); return update ? { ...l, availability: update.availability, blocks: update.blocks } : l; }) }));
            }
            catch { /* Existing edits remain in place during a temporary network interruption. */ }
        };
        const timer = setInterval(refresh, 60000);
        document.addEventListener('visibilitychange', refresh);
        return () => { stopped = true; clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
    }, [initial.id, preview]);
    async function start() {
        setStarting(true);
        setMessage('');
        try {
            if (preview) {
                const first = view.lessons.find(l => l.availability.available);
                if (first)
                    setSelected(first.id);
                return;
            }
            const response = await fetch(`/api/client/online-programs/${view.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start' }) });
            const data = await response.json();
            if (!response.ok)
                throw new Error(data.error);
            setView(data);
            const first = (data as ClientProgramView).lessons.find(l => l.availability.available);
            if (first)
                setSelected(first.id);
            else
                setMessage('Program si začal. Prvá lekcia sa otvorí v deň začiatku turnusu.');
        }
        catch (error) {
            setMessage(error instanceof Error ? error.message : 'Program sa nepodarilo začať.');
        }
        finally {
            setStarting(false);
        }
    }
    const lesson = view.lessons.find(l => l.id === selected), completed = view.lessons.filter(l => l.completedAt).length;
    const assetUrl = (id: string) => preview ? `/api/admin/online-programs/assets/${id}` : `/api/client/online-programs/${view.id}/assets/${id}`;
    return <PortalElement as="div" className="op op-stack">
    {!preview && <Link href="/ucet/produkty">← Moje programy</Link>}
    <PortalElement as="header">{view.fallback && <PortalElement as="p" className="op-notice">Obsah je zatiaľ dostupný v slovenčine.</PortalElement>}<PortalElement as="p" className="op-subtle">TVÔJ ONLINE PROGRAM</PortalElement><PortalElement as="h1">{view.title}</PortalElement>{view.description && <PortalElement as="p">{view.description}</PortalElement>}<PortalElement as="p" className="op-subtle">Harmonogram: {view.timezone}{view.expiresAt ? ` · prístup do ${new Intl.DateTimeFormat(localeTag(portalLanguage), { dateStyle: 'medium', timeZone: view.timezone }).format(new Date(view.expiresAt))}` : ''}</PortalElement></PortalElement>
    <PortalElement as="div" className="op-layout"><PortalElement as="aside" className="op-stack"><PortalElement as="nav" className="op-lessons" aria-label="Obsah programu">
      <PortalElement as="button" type="button" aria-pressed={selected === 'intro'} onClick={() => void choose('intro')}>Úvod programu<PortalElement as="span" className="op-subtle">Dostupný po kúpe</PortalElement></PortalElement>
      {view.lessons.map((l, index) => <PortalElement as="button" type="button" key={l.id} aria-pressed={l.id === selected} disabled={!l.availability.available} onClick={() => void choose(l.id)}><PortalElement as="span">{index + 1}. {l.title}</PortalElement><PortalElement as="span" className="op-subtle">{availabilityText(l,portalLanguage)}</PortalElement></PortalElement>)}
    </PortalElement><PortalElement as="div"><PortalElement as="p" className="op-subtle">Dokončené {completed} z {view.lessons.length} lekcií</PortalElement><PortalElement as="div" className="op-progress" role="progressbar" aria-label="Pokrok v programe" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={view.lessons.length || 1}><PortalElement as="span" style={{ width: `${view.lessons.length ? completed / view.lessons.length * 100 : 0}%` }}/></PortalElement></PortalElement></PortalElement>
    <PortalElement as="section" className="op-panel op-stack" aria-label="Obsah lekcie">
      {selected === 'intro' ? <><PortalElement as="h2">{view.intro.title || 'Vitaj v programe'}</PortalElement>{view.intro.videoAssetId && <PortalElement as="video" controls playsInline preload="metadata" src={assetUrl(view.intro.videoAssetId)} aria-label="Úvodné video"/>}<PortalElement as="p" className="op-text">{view.intro.text}</PortalElement><PortalElement as="div"><PortalElement as="button" type="button" className="op-primary" onClick={() => void start()} disabled={starting}>{starting ? 'Otváram…' : view.introCompleted ? 'Pokračovať v programe' : 'Začať program'}</PortalElement></PortalElement></>
            : lesson?.availability.available ? <LessonContent key={lesson.id} lesson={lesson} enrollmentId={view.id} assetUrl={assetUrl} preview={preview} flush={flush} onSaved={saved => setView(current => ({ ...current, lessons: current.lessons.map(l => l.id === lesson.id ? { ...l, ...saved } : l) }))} onComplete={() => setView(current => ({ ...current, lessons: current.lessons.map(l => l.id === lesson.id ? { ...l, completedAt: new Date().toISOString() } : l) }))}/>
                : <PortalElement as="p" className="op-notice">Táto lekcia teraz nie je dostupná. {lesson ? availabilityText(lesson,portalLanguage) : ''}</PortalElement>}
      <PortalElement as="p" role="status" aria-live="polite">{message}</PortalElement>
    </PortalElement></PortalElement>
  </PortalElement>;
}
function LessonContent({ lesson, enrollmentId, assetUrl, preview, flush, onComplete, onSaved }: {
    lesson: LessonView;
    enrollmentId: string;
    assetUrl: (id: string) => string;
    preview: boolean;
    flush: React.RefObject<() => Promise<boolean>>;
    onComplete: () => void;
    onSaved: (state: SavedLesson) => void;
}) {
    const [answers, setAnswers] = useState<Answers>(lesson.answers), [status, setStatus] = useState(''), [error, setError] = useState(''), [saving, setSaving] = useState(false), [complete, setComplete] = useState(!!lesson.completedAt);
    const current = useRef({ answers: lesson.answers, position: lesson.position, revision: lesson.revision, privateRevision: lesson.privateRevision });
    const completeCallback = useRef(onComplete);
    useEffect(() => { completeCallback.current = onComplete; }, [onComplete]);
    const savedCallback = useRef(onSaved);
    useEffect(() => { savedCallback.current = onSaved; }, [onSaved]);
    const dirty = useRef(false), timer = useRef<ReturnType<typeof setTimeout> | null>(null), inFlight = useRef<Promise<boolean> | null>(null);
    const save = useCallback(async (finish = false): Promise<boolean> => {
        if (timer.current)
            clearTimeout(timer.current);
        if (inFlight.current) {
            if (!await inFlight.current)
                return false;
        }
        if (preview) {
            dirty.current = false;
            if (finish) {
                setComplete(true);
                completeCallback.current();
            }
            return true;
        }
        if (!dirty.current && !finish)
            return true;
        const snapshot = { ...current.current, answers: { ...current.current.answers } }, serialized = JSON.stringify(snapshot.answers);
        setSaving(true);
        setStatus('Ukladám…');
        setError('');
        const operation = (async () => {
            try {
                const response = await fetch(`/api/client/online-programs/${enrollmentId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'progress', lessonId: lesson.id, ...snapshot, complete: finish }) });
                const result = await response.json();
                if (!response.ok)
                    throw new Error(result.error || 'Uloženie sa nepodarilo.');
                current.current.revision = result.revision;
                current.current.privateRevision = result.privateRevision;
                savedCallback.current({ answers: snapshot.answers, position: snapshot.position, revision: result.revision, privateRevision: result.privateRevision });
                dirty.current = serialized !== JSON.stringify(current.current.answers) || snapshot.position !== current.current.position;
                setStatus(dirty.current ? 'Zmeny čakajú na uloženie' : 'Uložené');
                if (finish) {
                    setComplete(true);
                    completeCallback.current();
                }
                return true;
            }
            catch (failure) {
                setStatus('Neuložené');
                setError(failure instanceof Error ? failure.message : 'Uloženie sa nepodarilo.');
                return false;
            }
            finally {
                setSaving(false);
                inFlight.current = null;
            }
        })();
        inFlight.current = operation;
        return operation;
    }, [enrollmentId, lesson.id, preview]);
    useEffect(() => {
        flush.current = async () => {
            if (inFlight.current && !await inFlight.current)
                return false;
            while (dirty.current)
                if (!await save())
                    return false;
            return true;
        };
        const unload = (event: BeforeUnloadEvent) => {
            if (dirty.current && !preview)
                event.preventDefault();
        };
        window.addEventListener('beforeunload', unload);
        return () => {
            if (timer.current)
                clearTimeout(timer.current);
            window.removeEventListener('beforeunload', unload);
            flush.current = async () => true;
        };
    }, [flush, save, preview]);
    const schedule = () => {
        if (timer.current)
            clearTimeout(timer.current);
        timer.current = setTimeout(() => void save(), 1200);
    };
    function update(id: string, value: Answers[string]) {
        const next = { ...current.current.answers, [id]: value };
        current.current.answers = next;
        setAnswers(next);
        dirty.current = true;
        setStatus('Zmeny čakajú na uloženie');
        schedule();
    }
    return <><PortalElement as="h2">{lesson.title}</PortalElement>{lesson.blocks.map(block => <PortalElement as="div" className="op-block op-stack op-tight" key={block.id}>
    {block.type !== 'question' && block.type !== 'rating' && block.title && <PortalElement as="h3">{block.title}</PortalElement>}
    {block.type === 'text' && <PortalElement as="p" className="op-text">{block.text}</PortalElement>}
    {block.type === 'video' && block.assetId && <><PortalElement as="video" controls playsInline preload="metadata" src={assetUrl(block.assetId)} aria-label={block.title || 'Video lekcie'} onLoadedMetadata={event => {
                    if (lesson.position && lesson.position < event.currentTarget.duration)
                        event.currentTarget.currentTime = lesson.position;
                }} onPause={event => { current.current.position = Math.floor(event.currentTarget.currentTime); dirty.current = true; schedule(); }} onTimeUpdate={event => {
                    const position = Math.floor(event.currentTarget.currentTime);
                    if (Math.abs(position - current.current.position) >= 15) {
                        current.current.position = position;
                        dirty.current = true;
                        schedule();
                    }
                }}/><PortalElement as="p" className="op-subtle op-player-note">Pozícia videa sa priebežne ukladá.</PortalElement></>}
    {block.type === 'audio' && block.assetId && <PortalElement as="audio" controls preload="metadata" src={assetUrl(block.assetId)} aria-label={block.title || 'Meditácia'}/>}
    {block.type === 'pdf' && block.assetId && <PortalElement as="div"><PortalElement as="a" className="op-button" href={assetUrl(block.assetId)} target="_blank" rel="noopener noreferrer">Stiahnuť PDF</PortalElement></PortalElement>}
    {'transcript' in block && block.transcript && <PortalElement as="details"><PortalElement as="summary">Prepis nahrávky</PortalElement><PortalElement as="p" className="op-text">{block.transcript}</PortalElement></PortalElement>}
    {(block.type === 'question' || block.type === 'rating') && <Question block={block} answer={answers[block.id]} update={value => update(block.id, value)}/>}
  </PortalElement>)}<PortalElement as="div" className="op-row"><PortalElement as="button" type="button" disabled={saving} onClick={() => void save()}>Uložiť teraz</PortalElement><PortalElement as="button" type="button" className="op-primary" disabled={saving || complete} onClick={() => void save(true)}>{complete ? 'Lekcia je dokončená' : 'Dokončiť lekciu'}</PortalElement></PortalElement><PortalElement as="p" className="op-subtle" role="status" aria-live="polite">{preview ? 'Náhľad · odpovede sa neposielajú do účtu klienta' : status}</PortalElement>{error && <PortalElement as="p" className="op-error" role="alert">{error}</PortalElement>}</>;
}
function Question({ block, answer, update }: {
    block: Extract<Block, {
        type: 'question' | 'rating';
    }> & {
        optionValues?: string[];
    };
    answer: Answers[string] | undefined;
    update: (value: Answers[string]) => void;
}) {
    return <PortalElement as="fieldset" className="op-stack op-tight"><PortalElement as="legend">{block.title} {block.required && <PortalElement as="span" className="op-required">(povinné)</PortalElement>}</PortalElement>
    <PortalElement as="p" className="op-subtle">{block.visibility === 'private' ? 'Súkromný zápis · vidíš ho iba ty; nevstupuje do štatistík sprievodcu.' : 'Odpoveď vidíš ty a sprievodca programu. Ostatní účastníci ju nevidia.'}</PortalElement>
    {block.type === 'rating' ? <><PortalElement as="p">{block.phase === 'before' ? 'Pred cvičením' : block.phase === 'after' ? 'Po cvičení' : 'Tvoje hodnotenie'}: <PortalElement as="output">{typeof answer === 'number' ? `${answer} / 10` : 'Zatiaľ nevyplnené'}</PortalElement></PortalElement><PortalElement as="div" className="op-row" role="group" aria-label={block.title}>{Array.from({ length: 11 }, (_, n) => <PortalElement as="button" type="button" key={n} aria-pressed={answer === n} onClick={() => update(n)}>{n}</PortalElement>)}</PortalElement><PortalElement as="div" className="op-rating-ends"><PortalElement as="span">0 · {block.lowLabel}</PortalElement><PortalElement as="span">10 · {block.highLabel}</PortalElement></PortalElement></>
            : block.kind === 'text' ? <PortalElement as="textarea" aria-label={block.title} value={typeof answer === 'string' ? answer : ''} maxLength={20000} onChange={event => update(event.target.value)}/>
                : block.options.map((option, index) => {
                    const value = block.optionValues?.[index] ?? option;
                    return <PortalElement as="label" className="op-check op-choice" key={index}><PortalElement as="input" type={block.kind === 'choice' ? 'radio' : 'checkbox'} name={block.id} checked={block.kind === 'choice' ? answer === value : Array.isArray(answer) && answer.includes(value)} onChange={event => {
                            if (block.kind === 'choice')
                                update(value);
                            else {
                                const selected = Array.isArray(answer) ? answer : [];
                                update(event.target.checked ? [...selected, value] : selected.filter(v => v !== value));
                            }
                        }}/><PortalElement as="span">{option}</PortalElement></PortalElement>;
                })}
  </PortalElement>;
}
