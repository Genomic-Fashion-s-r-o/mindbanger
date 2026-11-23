import type { BookingSettings, Service } from '@/lib/booking/model';
import ServiceSalesPage from './ServiceSalesPage';
import { serviceSalesCopy } from './service-sales-copy';

export const premiumDescription = 'Viac času pre to, na čom ti záleží. Prémiový mentálny koučing s Miroslavom Jobusom: dôkladné preskúmanie tvojej témy, osobná opora a príprava konkrétneho postupu.';

export default function PremiumCoaching({service,settings}:{service:Service;settings:BookingSettings}) {
  return <ServiceSalesPage service={service} settings={settings} copy={serviceSalesCopy['premiovy-mentalny-koucing']}/>;
}
