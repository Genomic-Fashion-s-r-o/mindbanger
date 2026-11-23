import type { BookingSettings, Service } from '@/lib/booking/model';
import ServiceSalesPage from './ServiceSalesPage';
import { serviceSalesCopy } from './service-sales-copy';

export const nextStepDescription = 'Stojíš pred rozhodnutím alebo cítiš, že chceš zmenu? Individuálny online koučing s Miroslavom Jobusom: opora, jasnejšie priority a ďalší krok, ktorý dáva zmysel tebe.';

export default function NextStepCoaching({service,settings}:{service:Service;settings:BookingSettings}) {
  return <ServiceSalesPage service={service} settings={settings} copy={serviceSalesCopy['individualny-coaching']}/>;
}
