import {localeTag} from '@/lib/portal-locale';
import {portalLocale} from '@/lib/portal-locale-server';
import PortalElement from '@/components/client/PortalElement';
import Link from '@/components/client/PortalLink';
import { getServiceSupabase } from '@/lib/supabase-service';
import { getClientContext } from '@/lib/client-context';
import { PersonalShell } from '@/components/personal/PersonalShell';
import { getLocalizedBookingSettings } from '@/lib/booking/store';
import { localizedProgram, programConfigSchema, enrollmentActive, type Enrollment, type ProgramConfig } from '@/lib/online-programs/model';
import { checked } from '@/lib/online-programs/store';
import './online-programs.css';
export async function publicProgramOffer(slug: string) {
    const db = getServiceSupabase();
    const result = await db.from('online_programs').select('id,published_version_id,price_cents,currency').eq('slug', slug).eq('sales_enabled', true).maybeSingle();
    if (result.error?.code === '42P01' || result.error?.code === 'PGRST205')
        return null;
    const program = checked(result);
    if (!program?.published_version_id)
        return null;
    const version = checked(await db.from('online_program_versions').select('config').eq('id', program.published_version_id).single());
    const config = localizedProgram(programConfigSchema.parse(version.config), await portalLocale());
    const cohorts = config.mode === 'cohort' ? checked(await db.from('online_program_cohorts').select('id,name,starts_on').eq('program_id', program.id).eq('status', 'open').order('starts_on')) : [];
    return { id: program.id, title: config.title, description: config.description, mode: config.mode, timezone: config.timezone, lessonCount: config.lessons.length, accessDays: config.accessDays, release: config.release, terms: config.terms, price: program.price_cents, currency: program.currency, cohorts };
}
export async function ProgramSales({ offer }: {
    offer: NonNullable<Awaited<ReturnType<typeof publicProgramOffer>>>;
}) {
    const portalLanguage = await portalLocale();
    const [{ settings, locale }, context] = await Promise.all([getLocalizedBookingSettings(), getClientContext()]);
    const prefix = locale === 'cs' ? '/cz' : '';
    const mine = context ? checked(await getServiceSupabase().from('online_program_enrollments').select('*').eq('user_id', context.user.id).eq('program_id', offer.id).eq('status', 'active')) as Enrollment[] : [];
    const active = mine.find(e => enrollmentActive(e));
    return <PersonalShell settings={settings}><PortalElement as="main" className="personal-main op op-stack" style={{ maxWidth: 1100, margin: 'auto', padding: '48px 24px' }}><PortalElement as="header"><PortalElement as="p" className="personal-eyebrow">ONLINE PROGRAM</PortalElement><PortalElement as="h1">{offer.title}</PortalElement><PortalElement as="p" className="op-text">{offer.description}</PortalElement></PortalElement><PortalElement as="div" className="op-grid"><PortalElement as="section" className="op-panel op-stack"><PortalElement as="h2">Čo ťa čaká</PortalElement><PortalElement as="p">{offer.lessonCount} lekcií{offer.release === 'daily' ? ' · každý deň nová lekcia o polnoci' : offer.release === 'all' ? ' · obsah dostupný od začiatku' : ' · postupné sprístupňovanie podľa harmonogramu'}</PortalElement><PortalElement as="p">{offer.accessDays ? `Prístup na ${offer.accessDays} dní.` : 'Prístup bez časového obmedzenia.'}</PortalElement>{offer.mode === 'cohort' && <><PortalElement as="h3">Otvorené turnusy</PortalElement>{offer.cohorts.length ? offer.cohorts.map(c => <PortalElement as="p" key={c.id}>{c.name} · začiatok {new Intl.DateTimeFormat(localeTag(portalLanguage), { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(c.starts_on + 'T12:00:00Z'))}</PortalElement>) : <PortalElement as="p">Ďalší turnus pripravujeme.</PortalElement>}</>}</PortalElement><PortalElement as="section" className="op-panel op-stack"><PortalElement as="h2">{new Intl.NumberFormat(localeTag(portalLanguage), { style: 'currency', currency: offer.currency }).format(offer.price / 100)}</PortalElement><PortalElement as="p">Jednorazová platba. Po potvrdení nákupu nájdeš program vo svojej klientskej zóne.</PortalElement><Link className="op-button op-primary" prefetch={false} href={prefix + (active ? '/ucet/programy/' + active.id : '/ucet/produkty')}>{active ? 'Otvoriť môj program' : 'Vybrať turnus a kúpiť program'}</Link><PortalElement as="details"><PortalElement as="summary">Podmienky nákupu</PortalElement><PortalElement as="p" className="op-text">{offer.terms}</PortalElement></PortalElement></PortalElement></PortalElement></PortalElement></PersonalShell>;
}
