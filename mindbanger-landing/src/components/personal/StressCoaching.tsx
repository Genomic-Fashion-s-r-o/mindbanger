import type { BookingSettings, Service } from '@/lib/booking/model';
import ServiceSalesPage from './ServiceSalesPage';
import { serviceSalesCopy } from './service-sales-copy';

export const stressDescription = 'Keď je toho na teba priveľa, nemusíš na to zostať sám. Online koučing s Miroslavom Jobusom: pomenuj záťaž, ujasni si hranice a nájdi zvládnuteľné kroky pre svoj deň.';

export default function StressCoaching({service,settings}:{service:Service;settings:BookingSettings}) {
  return <ServiceSalesPage service={service} settings={settings} copy={serviceSalesCopy['zvladaj-stres']}/>;
}
