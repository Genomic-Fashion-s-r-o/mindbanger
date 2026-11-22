import { campaignSources } from '@/lib/marketing-attribution';
import type { Appointment } from '@/lib/booking/model';
export default function BookingSourceInfo({booking}:{booking:Pick<Appointment,'marketingSource'|'marketingSourceUnavailable'|'marketingExcluded'>}) {
  const source=booking.marketingSource;
  return <div className="booking-marketing-source"><strong>Zdroj rezervácie</strong>
    {booking.marketingExcluded?<p>Interná skúšobná rezervácia · mimo marketingových štatistík.</p>
      :booking.marketingSourceUnavailable?<p>Zdroj sa teraz nepodarilo načítať.</p>
      :source?<p>{campaignSources[source.source]} · <strong>{source.ad_name}</strong>{source.campaign_name&&<><br/>Kampaň: {source.campaign_name}</>}{source.is_test&&<><br/>Testovací odkaz · mimo štatistík</>}</p>
      :<p>Nezistený · bez označeného odkazu alebo súhlasu. Zdroj neodhadujeme.</p>}
  </div>;
}
