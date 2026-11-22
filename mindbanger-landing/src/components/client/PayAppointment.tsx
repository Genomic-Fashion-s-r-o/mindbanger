'use client';
import {localeTag} from '@/lib/portal-locale';
import {usePortalLocale} from '@/components/client/PortalElement';
import PortalElement from '@/components/client/PortalElement';
import { trackAnalytics } from '@/lib/analytics-client';
import { useState } from 'react';
import Link from '@/components/client/PortalLink';
import { PAYMENT_TERMS_VERSION, AUTHORIZATION_TERMS_VERSION, money, type Appointment } from '@/lib/booking/model';
import { cancellationText, earlyServiceText, earlyServiceTextCs, withdrawalText, withdrawalTextCs } from '@/lib/booking/payment-terms';
export default function PayAppointment({ id, price, earlyRequired, policy }: {
    id: string;
    price: number;
    earlyRequired: boolean;
    policy: NonNullable<Appointment['payment_terms']>;
}) {
    const portalLanguage = usePortalLocale();
    const manual = policy.version === AUTHORIZATION_TERMS_VERSION;
    const cs = policy.locale === 'cs', amount = money(price, policy.currency, portalLanguage), c = (sk: string, cz: string) => cs ? cz : sk;
    const [busy, setBusy] = useState(false), [error, setError] = useState(''), [accepted, setAccepted] = useState(false), [early, setEarly] = useState(false);
    async function pay() {
        setBusy(true);
        setError('');
        try {
            const r = await fetch('/api/client/appointments/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, accepted, earlyService: early, termsVersion: manual ? AUTHORIZATION_TERMS_VERSION : PAYMENT_TERMS_VERSION }) });
            const data = await r.json();
            if (!r.ok)
                throw new Error(data.error);
            const url = new URL(data.url);
            if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com')
                throw new Error('Neplatný platobný odkaz.');
            trackAnalytics('payment_start');
            await new Promise(resolve => setTimeout(resolve, 150));
            window.location.assign(url.href);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Platba je dočasne nedostupná.');
            setBusy(false);
        }
    }
    return <PortalElement as="div">
  <PortalElement as="details"><PortalElement as="summary">{c('Podmienky objednávky, storna a odstúpenia', 'Podmínky objednávky, storna a odstoupení')}</PortalElement>
   <PortalElement as="p">{policy.provider} · IČO {policy.companyId}<PortalElement as="br"/>{policy.registeredAddress}<PortalElement as="br"/>{policy.registration}<PortalElement as="br"/>{policy.email} · {policy.phone}</PortalElement>
   <PortalElement as="p">{policy.serviceName || c('Individuálny online coaching', 'Individuální online koučink')} · {policy.minutes || 50} {c('minút stretnutia', 'minut setkání')} · {(policy.slotMinutes || (policy.minutes || 50) + 10)} {c('minút rezervovaný čas', 'minut rezervovaný čas')} · {c('konečná cena', 'konečná cena')} {amount}.{policy.package && <> {c('Balíček', 'Balíček')} {policy.package.name}: {policy.package.creditMinutes ? <>{policy.package.creditMinutes / 60} h {c('rezervačného času, platnosť 12 mesiacov od úhrady', 'rezervačního času, platnost 12 měsíců od zaplacení')}</> : <>{policy.package.sessions} {c('sedení', 'setkání')}</>}. {policy.package.extras}.</>} {c('Termín je uvedený pri rezervácii. Pripojenie dohodneme emailom.', 'Termín je uveden u rezervace. Připojení dohodneme e-mailem.')} {manual ? c('Stripe pri žiadosti zablokuje sumu na karte. Strhne sa až osobným potvrdením poskytovateľa; tým vznikne zmluva o platenej službe.', 'Stripe při žádosti zablokuje částku na kartě. Strhne se až osobním potvrzením poskytovatele; tím vznikne smlouva o placené službě.') : c('Zmluva o platenej službe vznikne úspešnou úhradou.', 'Smlouva o placené službě vznikne úspěšnou platbou.')} {c('Jednorazová platba, bez predplatného.', 'Jednorázová platba, bez předplatného.')}</PortalElement>
   <PortalElement as="p">{cancellationText(policy)}</PortalElement><PortalElement as="p">{cs ? withdrawalTextCs : withdrawalText}</PortalElement>
   <PortalElement as="p">{c('Reklamáciu uplatni na kontakte poskytovateľa; ďalšie informácie sú v', 'Reklamaci uplatni na kontaktu poskytovatele; další informace jsou v')} <Link href={cs ? '/cz/podmienky' : '/podmienky'} target="_blank">{c('podmienkach stretnutí', 'podmínkách setkání')}</Link>.</PortalElement>
  </PortalElement>
  <PortalElement as="div" className="payment-consents"><PortalElement as="label" className="payment-consent"><PortalElement as="input" type="checkbox" checked={accepted} disabled={busy} onChange={e => setAccepted(e.target.checked)}/><PortalElement as="span">{c('Oboznámil/a som sa s podmienkami objednávky, storna a odstúpenia a súhlasím s objednaním platenej služby.', 'Seznámil/a jsem se s podmínkami objednávky, storna a odstoupení a souhlasím s objednáním placené služby.')}</PortalElement></PortalElement>{earlyRequired && <PortalElement as="label" className="payment-consent"><PortalElement as="input" type="checkbox" checked={early} disabled={busy} onChange={e => setEarly(e.target.checked)}/><PortalElement as="span">{cs ? earlyServiceTextCs : earlyServiceText}</PortalElement></PortalElement>}</PortalElement>
  <PortalElement as="button" type="button" className="client-button payment-submit" aria-busy={busy} disabled={busy || !accepted || (earlyRequired && !early)} onClick={pay}>{busy ? c('Pripravujem platbu…', 'Připravuji platbu…') : `${c('Objednať s povinnosťou platby', 'Objednat s povinností platby')} ${amount} ↗`}</PortalElement>
  {error && <PortalElement as="p" role="alert" className="client-error">{error}</PortalElement>}<PortalElement as="p">{c('Ak nechceš začať službu pred uplynutím 14 dní, dohodni si neskorší termín.', 'Pokud nechceš začít službu před uplynutím 14 dnů, domluv si pozdější termín.')} {manual ? c('Teraz ide o blokáciu sumy. Úhrada nastane až po potvrdení poskytovateľom.', 'Nyní jde o blokaci částky. Platba proběhne až po potvrzení poskytovatelem.') : c('Úhradu overuje Stripe.', 'Platbu ověřuje Stripe.')}</PortalElement>
 </PortalElement>;
}
