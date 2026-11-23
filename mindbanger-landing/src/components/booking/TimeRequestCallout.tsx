import PortalElement from '@/components/client/PortalElement';
import Link from '@/components/client/PortalLink';
import { localizedPath, type SiteLocale } from '@/lib/site-locale';
import './time-requests.css';
export default function TimeRequestCallout({ locale = 'sk', serviceId = '' }: {
    locale?: SiteLocale;
    serviceId?: string;
}) {
    const cs = locale === 'cs', href = localizedPath('/ziadost-o-termin', locale) + (serviceId ? '?sluzba=' + encodeURIComponent(serviceId) : '');
    return <PortalElement as="aside" className="time-request-callout" aria-label={cs ? 'Individuální domluva termínu' : 'Individuálna dohoda termínu'}>
    <PortalElement as="div"><PortalElement as="h2">{cs ? 'Nenašel/a jsi termín, který ti vyhovuje?' : 'Nenašiel/a si termín, ktorý ti vyhovuje?'}</PortalElement><PortalElement as="p">{cs ? 'Vyplň krátký formulář. Ozvu se ti osobně a zkusíme najít řešení individuálně.' : 'Vyplň krátky formulár. Ozvem sa ti osobne a skúsime nájsť riešenie individuálne.'}</PortalElement></PortalElement>
    <Link href={href}>{cs ? 'Požádat o jiný termín' : 'Požiadať o iný termín'} <PortalElement as="span" aria-hidden="true">↗</PortalElement></Link>
  </PortalElement>;
}
