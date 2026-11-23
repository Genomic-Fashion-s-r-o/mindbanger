'use client';
import {localeTag} from '@/lib/portal-locale';
import {usePortalLocale} from '@/components/client/PortalElement';
import PortalElement from '@/components/client/PortalElement';
import Link from '@/components/client/PortalLink';
import { useEffect, useRef, useState } from 'react';
import { calendarAddDays as addDays, calendarMonday as monday, availableCalendarHours, openingCalendarWeek } from '@/lib/booking/calendar-display';
import { watchCalendarAvailability } from '@/lib/booking/calendar-refresh';
import { localDate, TIME_ZONE, money } from '@/lib/booking/model';
import { durationLabel } from '@/lib/booking/catalog';
import { COACHING } from '@/lib/booking/offer';
import { serviceUrl } from '@/lib/booking/catalog';
import './booking-experience.css';
type Props = {
    enabled: boolean;
    selected?: string;
    onSelect?: (start: string) => void;
    onSelectionUnavailable?: () => void;
    initialStart?: string;
    horizonDays?: number;
    refresh?: number;
    serviceId?: string;
    minutes?: number;
    slotMinutes?: number;
    price?: number;
    packageId?: string;
    entitlementId?: string;
    selectionDisabled?: boolean;
    locale?: 'sk' | 'cs' | 'en';
};
export default function WeeklyBookingSlots({ enabled, selected = '', onSelect, onSelectionUnavailable, initialStart = '', horizonDays = 60, refresh = 0, serviceId = COACHING.id, minutes = 50, slotMinutes = minutes + 10, price = 49, packageId = '', entitlementId = '', selectionDisabled = false, locale = 'sk' }: Props) {
    const portalLanguage = usePortalLocale();
    const cs = locale === 'cs', intlLocale = localeTag(portalLanguage);
    const c = (sk: string, cz: string) => cs ? cz : sk;
    const clock = new Intl.DateTimeFormat(intlLocale, { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' });
    const dayLabel = new Intl.DateTimeFormat(intlLocale, { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'numeric' });
    const weekday = new Intl.DateTimeFormat(intlLocale, { timeZone: 'UTC', weekday: 'short' });
    const fullDay = new Intl.DateTimeFormat(intlLocale, { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
    const [today] = useState(() => localDate(new Date()));
    const [week, setWeek] = useState(() => monday(initialStart && Number.isFinite(Date.parse(initialStart)) ? localDate(new Date(initialStart)) : today));
    const currentWeek = useRef(week), findInitialWeek = useRef(!initialStart || !Number.isFinite(Date.parse(initialStart)));
    const [navigation, setNavigation] = useState(0);
    const [requestedDay, setRequestedDay] = useState('');
    const [data, setData] = useState<Record<string, string[]>>({}), [loading, setLoading] = useState(true), [error, setError] = useState(''), [retry, setRetry] = useState(0);
    const [occupied, setOccupied] = useState<Record<string, string[]>>({});
    const dates = Array.from({ length: 7 }, (_, i) => addDays(week, i));
    useEffect(() => {
        if (!enabled || selectionDisabled)
            return;
        return watchCalendarAvailability(() => setRetry(v => v + 1));
    }, [enabled, selectionDisabled]);
    useEffect(() => {
        setData({});
        setOccupied({});
        setError('');
        if (!enabled) {
            setLoading(false);
            return;
        }
        const controller = new AbortController();
        setLoading(true);
        void openingCalendarWeek({ week: currentWeek.current, today, horizonDays, search: findInitialWeek.current, signal: controller.signal, loadDay: async (day) => {
                const r = await fetch(`/api/appointments?service=${encodeURIComponent(serviceId)}&day=${day}&duration=${slotMinutes}`, { cache: 'no-store', signal: controller.signal });
                const result = await r.json();
                if (!r.ok)
                    throw Error(result.error || c('Dostupnosť sa nepodarilo načítať.', 'Dostupnost se nepodařilo načíst.'));
                return { slots: result.slots as string[], occupiedSlots: (result.occupiedSlots || []) as string[] };
            } }).then(({ week: loadedWeek, rows }) => {
            if (!controller.signal.aborted) {
                findInitialWeek.current = false;
                currentWeek.current = loadedWeek;
                setWeek(loadedWeek);
                setData(Object.fromEntries(rows.map(([day, result]) => [day, result.slots])));
                setOccupied(Object.fromEntries(rows.map(([day, result]) => [day, result.occupiedSlots])));
            }
        })
            .catch(e => {
            if (!controller.signal.aborted)
                setError(e.message);
        })
            .finally(() => {
            if (!controller.signal.aborted)
                setLoading(false);
        });
        return () => controller.abort();
    }, [navigation, enabled, retry, refresh, today, horizonDays, serviceId, slotMinutes]);
    useEffect(() => {
        if (!loading && !error && enabled && selected && Object.keys(data).length && !Object.values(data).flat().includes(selected))
            onSelectionUnavailable?.();
    }, [loading, error, enabled, selected, data, onSelectionUnavailable]);
    const selectedDay = selected ? localDate(new Date(selected)) : '';
    const activeDay = dates.includes(requestedDay) && (data[requestedDay]?.length || occupied[requestedDay]?.length) ? requestedDay
        : dates.includes(selectedDay) && data[selectedDay]?.length ? selectedDay : dates.find(d => data[d]?.length) || dates.find(d => occupied[d]?.length) || '';
    const allStarts = [...Object.values(data).flat(), ...Object.values(occupied).flat()];
    const times = [...new Set(allStarts.map(s => clock.format(new Date(s))))].sort();
    const activeStarts = [...(data[activeDay] || []), ...(occupied[activeDay] || [])].sort();
    const displayTimes = times.length ? times : Array.from({ length: 10 }, (_, i) => String(i + 9).padStart(2, '0') + ':00');
    const locked = selectionDisabled || loading || !enabled || !!error;
    const hours = (starts: string[]) => new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 2 }).format(availableCalendarHours(starts, slotMinutes));
    const pastLabel = c('Už sa nedá rezervovať', 'Už nelze rezervovat');
    function changeWeek(next: string) { findInitialWeek.current = false; currentWeek.current = next; setWeek(next); setNavigation(v => v + 1); setRequestedDay(''); onSelect?.(''); }
    function chooseDay(day: string) {
        setRequestedDay(day);
        if (selected && selectedDay !== day)
            onSelect?.('');
    }
    const bookingHref = (start: string) => serviceUrl(serviceId, packageId, start, entitlementId).replace('/rezervacia?', '/ucet/rezervovat?');
    return <PortalElement as="section" className="weekly-booking" aria-label={c('Výber dňa a času stretnutia', 'Výběr dne a času setkání')} aria-busy={loading}>
    <PortalElement as="div" className="weekly-booking-toolbar">
      <PortalElement as="button" type="button" disabled={week <= monday(today) || loading || selectionDisabled} onClick={() => changeWeek(addDays(week, -7))} aria-label={c('Predchádzajúci týždeň', 'Předchozí týden')}>←</PortalElement>
      <PortalElement as="div"><PortalElement as="strong">{new Intl.DateTimeFormat(intlLocale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(week + 'T12:00Z'))} – {new Intl.DateTimeFormat(intlLocale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(addDays(week, 6) + 'T12:00Z'))}</PortalElement><PortalElement as="span">Bratislava · {durationLabel(minutes)} · {money(price, cs ? 'czk' : 'eur', portalLanguage)}</PortalElement></PortalElement>
      <PortalElement as="button" type="button" disabled={addDays(week, 7) > addDays(today, horizonDays) || loading || selectionDisabled} onClick={() => changeWeek(addDays(week, 7))} aria-label={c('Nasledujúci týždeň', 'Následující týden')}>→</PortalElement>
    </PortalElement>
    {enabled && <PortalElement as="button" type="button" className="personal-text-link booking-refresh" style={{ marginBottom: 16 }} disabled={loading || selectionDisabled} onClick={() => setRetry(v => v + 1)}>{c('Obnoviť dostupnosť', 'Obnovit dostupnost')}</PortalElement>}
    {enabled && !loading && !error && <PortalElement as="p" className="booking-slot-legend"><PortalElement as="span" className="booking-slot-legend-free">{c('Voľné', 'Volné')}</PortalElement><PortalElement as="span" className="booking-slot-legend-occupied">{c('Obsadené', 'Obsazeno')}</PortalElement></PortalElement>}
    {enabled && !loading && !error && <PortalElement as="p" className="booking-free-hours">{c('Voľný rezervačný čas v tomto týždni', 'Volný rezervační čas v tomto týdnu')}: <PortalElement as="strong">{hours(Object.values(data).flat())} h</PortalElement></PortalElement>}
    {!enabled && <PortalElement as="p" className="personal-notice" role="status">{c('Kalendár pripravujeme. Dostupné časy sa sprístupnia po dokončení nastavení rezervácií.', 'Kalendář připravujeme. Dostupné časy se zobrazí po dokončení nastavení rezervací.')}</PortalElement>}
    {loading && <PortalElement as="p" role="status">{c('Načítavam voľné termíny…', 'Načítám volné termíny…')}</PortalElement>}
    {error && <PortalElement as="p" role="alert">{error} <PortalElement as="button" type="button" className="personal-text-link" onClick={() => setRetry(v => v + 1)}>{c('Skúsiť znova', 'Zkusit znovu')}</PortalElement></PortalElement>}
    <PortalElement as="div" className="booking-mobile-picker">
      <PortalElement as="fieldset" className="booking-day-fieldset" disabled={locked}><PortalElement as="legend">{c('Deň stretnutia', 'Den setkání')}</PortalElement><PortalElement as="div" className="booking-day-grid">{dates.map(day => {
            const count = data[day]?.length || 0, booked = occupied[day]?.length || 0, date = new Date(day + 'T12:00Z');
            const past = day < today, availability = past ? pastLabel : loading ? '…' : count ? `${hours(data[day])} h ${c('voľné', 'volné')}` : booked ? c('Obsadené', 'Obsazeno') : c('Bez otvorených termínov', 'Bez otevřených termínů');
            return <PortalElement as="button" key={day} type="button" disabled={past || (!count && !booked)} className={past ? 'is-past' : !count && booked ? 'is-fully-booked' : undefined} aria-pressed={activeDay === day} aria-label={`${fullDay.format(date)}, ${availability}`} onClick={() => chooseDay(day)}><PortalElement as="span">{weekday.format(date)}</PortalElement><PortalElement as="strong">{date.getUTCDate()}. {date.getUTCMonth() + 1}.</PortalElement><PortalElement as="small">{availability}</PortalElement></PortalElement>;
        })}</PortalElement></PortalElement>
      {activeDay && !loading && !error && <PortalElement as="fieldset" className="booking-time-fieldset" disabled={locked}><PortalElement as="legend">{c('Časy stretnutí', 'Časy setkání')}</PortalElement><PortalElement as="p" className="booking-active-day">{fullDay.format(new Date(activeDay + 'T12:00Z'))}</PortalElement><PortalElement as="div" className="booking-time-grid">{activeStarts.map(start => occupied[activeDay]?.includes(start)
                ? <PortalElement as="button" key={start} type="button" disabled className="booking-slot-occupied" aria-label={`${clock.format(new Date(start))} – ${c('Obsadené', 'Obsazeno')}`}><PortalElement as="span">{clock.format(new Date(start))}</PortalElement><PortalElement as="small">{c('Obsadené', 'Obsazeno')}</PortalElement></PortalElement>
                : onSelect
                    ? <PortalElement as="button" key={start} type="button" aria-pressed={selected === start} aria-label={`${c('Vybrať', 'Vybrat')} ${dayLabel.format(new Date(activeDay + 'T12:00Z'))} ${c('o', 'v')} ${clock.format(new Date(start))}`} onClick={() => onSelect(start)}>{clock.format(new Date(start))}{selected === start && <PortalElement as="span" aria-hidden="true"> ✓</PortalElement>}</PortalElement>
                    : <Link key={start} href={bookingHref(start)} aria-label={`${c('Rezervovať', 'Rezervovat')} ${dayLabel.format(new Date(activeDay + 'T12:00Z'))} ${c('o', 'v')} ${clock.format(new Date(start))}`}>{clock.format(new Date(start))}</Link>)}</PortalElement><PortalElement as="p" className="booking-mobile-duration">{durationLabel(minutes)} · online · {c('čas v Bratislave', 'čas v Bratislavě')}</PortalElement></PortalElement>}
    </PortalElement>
    <PortalElement as="div" className="weekly-booking-scroll booking-desktop-picker" tabIndex={0} role="region" aria-label={c('Týždenný prehľad voľných termínov', 'Týdenní přehled volných termínů')}><PortalElement as="table"><PortalElement as="caption">{c('Vyber voľný čas. Rezervačný slot:', 'Vyber volný čas. Rezervační slot:')} {durationLabel(minutes)} ({slotMinutes} {c('minút', 'minut')}).</PortalElement><PortalElement as="thead"><PortalElement as="tr"><PortalElement as="th" scope="col">{c('Čas', 'Čas')}</PortalElement>{dates.map(d => <PortalElement as="th" key={d} scope="col" className={d === today ? 'is-today' : ''}>{dayLabel.format(new Date(d + 'T12:00Z'))}{!loading && !error && <PortalElement as="small" className="booking-day-capacity">{d < today ? c('Minulý deň', 'Minulý den') : data[d]?.length ? `${hours(data[d])} h ${c('voľné', 'volné')}` : occupied[d]?.length ? c('Obsadené', 'Obsazeno') : c('Bez otvorených termínov', 'Bez otevřených termínů')}</PortalElement>}</PortalElement>)}</PortalElement></PortalElement><PortalElement as="tbody">{displayTimes.map((time, timeIndex) => <PortalElement as="tr" key={time}><PortalElement as="th" scope="row">{time}</PortalElement>{dates.map(d => {
                if (d < today)
                    return timeIndex === 0 ? <PortalElement as="td" key={d} rowSpan={displayTimes.length} className="booking-past-day">{pastLabel}</PortalElement> : null;
                const start = data[d]?.find(s => clock.format(new Date(s)) === time);
                const booked = occupied[d]?.some(s => clock.format(new Date(s)) === time);
                return <PortalElement as="td" key={d}>{start && !loading && !error ? (onSelect ? <PortalElement as="button" type="button" disabled={selectionDisabled} aria-pressed={selected === start} aria-label={`${c('Vybrať', 'Vybrat')} ${dayLabel.format(new Date(d + 'T12:00Z'))} ${c('o', 'v')} ${time}`} onClick={() => onSelect(start)}>{c('Vybrať', 'Vybrat')} <PortalElement as="span">{time}</PortalElement></PortalElement> : <Link href={bookingHref(start)} aria-label={`${c('Rezervovať', 'Rezervovat')} ${dayLabel.format(new Date(d + 'T12:00Z'))} ${c('o', 'v')} ${time}`}>{c('Vybrať', 'Vybrat')} <PortalElement as="span">{time}</PortalElement></Link>) : booked && !loading && !error ? <PortalElement as="span" className="booking-slot-occupied" aria-label={`${time} – ${c('Obsadené', 'Obsazeno')}`}>{c('Obsadené', 'Obsazeno')}<PortalElement as="small">{time}</PortalElement></PortalElement> : <PortalElement as="span" className="weekly-slot-unavailable" aria-label={c('Nedostupné', 'Nedostupné')}>—</PortalElement>}</PortalElement>;
            })}</PortalElement>)}</PortalElement></PortalElement></PortalElement>
    {enabled && !loading && !error && !Object.values(data).some(slots => slots.length) && <PortalElement as="p" role="status">{c('V tomto týždni nie sú voľné termíny. Skús nasledujúci týždeň pomocou šípky vyššie.', 'V tomto týdnu nejsou volné termíny. Zkus následující týden pomocí šipky výše.')}</PortalElement>}
    <PortalElement as="p" className="weekly-booking-help">{c('Vybraný čas sa overí pri odoslaní objednávky. Samotný výber ho ešte neblokuje.', 'Vybraný čas se ověří při odeslání objednávky. Samotný výběr ho ještě neblokuje.')}</PortalElement>
  </PortalElement>;
}
