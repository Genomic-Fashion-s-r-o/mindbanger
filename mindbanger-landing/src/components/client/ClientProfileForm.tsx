'use client';
import PortalElement,{usePortalLocale} from '@/components/client/PortalElement';
import{portalPath,normalizeLocale}from '@/lib/portal-locale';
import Link from '@/components/client/PortalLink';
import { useState } from 'react';
import { CLIENT_TERMS_VERSION, safeClientReturn } from '@/lib/client-platform';
export default function ClientProfileForm({ name, email, birthYear = null, language = 'sk', timezone = 'Europe/Bratislava', onboarding = false, next = '/ucet' }: {
    name: string;
    email: string;
    birthYear?: number | null;
    language?: string;
    timezone?: string;
    onboarding?: boolean;
    next?: string;
}) {
    const portalLanguage=usePortalLocale();
    const [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false);
    async function save(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setError('');
        setSaved(false);
        const form = new FormData(event.currentTarget);
        try {
            const response = await fetch('/api/client/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: form.get('name'), birthYear: form.get('birthYear') ? Number(form.get('birthYear')) : null, language: form.get('language'), timezone: form.get('timezone'), ...(onboarding ? { accepted: true, termsVersion: CLIENT_TERMS_VERSION } : {}) }) });
            const result = await response.json();
            if (!response.ok)
                throw new Error(result.error);
            const selectedLanguage=normalizeLocale(form.get('language'));document.cookie='user-lang='+selectedLanguage+'; path=/; max-age=31536000; SameSite=Lax';
            if (onboarding) {
                window.location.assign(portalPath(safeClientReturn(next),selectedLanguage));
                return;
            }
            if(selectedLanguage!==portalLanguage){window.location.assign(portalPath('/ucet/profil',selectedLanguage));return;}
            setSaved(true);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Uloženie sa nepodarilo.');
        }
        finally {
            setBusy(false);
        }
    }
    return <PortalElement as="form" className="client-form" onSubmit={save}><PortalElement as="label" htmlFor="client-name">Meno a priezvisko<PortalElement as="input" id="client-name" name="name" required minLength={2} maxLength={100} autoComplete="name" defaultValue={name}/></PortalElement><PortalElement as="label" htmlFor="client-email">Prihlasovací email<PortalElement as="input" id="client-email" type="email" value={email} disabled/><PortalElement as="small">Toto je email na prihlasovanie do účtu. Jeho zmenu riešime samostatným overením.</PortalElement></PortalElement><PortalElement as="label" htmlFor="client-birth-year">Rok narodenia<PortalElement as="input" id="client-birth-year" name="birthYear" type="number" inputMode="numeric" autoComplete="bday-year" min={1900} max={new Date().getFullYear() - 18} defaultValue={birthYear ?? ''}/><PortalElement as="small">Na orientačné vekové prehľady členov a ich záujmu o programy. Neslúži na obnovu hesla.</PortalElement></PortalElement><PortalElement as="div" className="client-form-row"><PortalElement as="label" htmlFor="client-language">Preferovaný jazyk<PortalElement as="select" id="client-language" name="language" defaultValue={onboarding?portalLanguage:language}><PortalElement as="option" value="sk">Slovenčina</PortalElement><PortalElement as="option" value="cs">Čeština</PortalElement><PortalElement as="option" value="en">English</PortalElement></PortalElement></PortalElement><PortalElement as="label" htmlFor="client-timezone">Časové pásmo<PortalElement as="input" id="client-timezone" name="timezone" defaultValue={timezone} required list="client-timezones"/><PortalElement as="datalist" id="client-timezones"><PortalElement as="option" value="Europe/Bratislava"/><PortalElement as="option" value="Europe/Prague"/><PortalElement as="option" value="Europe/London"/><PortalElement as="option" value="UTC"/></PortalElement></PortalElement></PortalElement>{onboarding && <PortalElement as="label" className="client-check"><PortalElement as="input" type="checkbox" required/><PortalElement as="span">Súhlasím s <Link href="/podmienky-uctu" target="_blank" rel="noopener noreferrer">podmienkami bezplatného účtu</Link> a oboznámil/a som sa s <Link href="/ochrana-udajov" target="_blank" rel="noopener noreferrer">ochranou osobných údajov</Link>. Tento krok nie je nákupom ani prihlásením na marketing.</PortalElement></PortalElement>}{error && <PortalElement as="p" className="client-error" role="alert">{error}</PortalElement>}{saved && <PortalElement as="p" className="client-success" role="status">Údaje sú uložené.</PortalElement>}<PortalElement as="button" className="client-button" disabled={busy}>{busy ? 'Ukladám…' : onboarding ? 'Otvoriť môj účet' : 'Uložiť údaje'} <PortalElement as="span" aria-hidden="true">↗</PortalElement></PortalElement></PortalElement>;
}
