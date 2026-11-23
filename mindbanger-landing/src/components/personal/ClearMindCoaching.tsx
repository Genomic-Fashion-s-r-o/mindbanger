import type { BookingSettings, Service } from '@/lib/booking/model';
import ServiceSalesPage from './ServiceSalesPage';
import { serviceSalesCopy } from './service-sales-copy';

export const clearMindDescription = 'Keď myšlienky bežia ďalej, nemusíš na ne zostať sám. Online koučing s Miroslavom Jobusom: priestor vydýchnuť, utriediť si myšlienky a nájsť vlastný ďalší krok.';

export default function ClearMindCoaching({service,settings}:{service:Service;settings:BookingSettings}) {
  return <ServiceSalesPage service={service} settings={settings} copy={serviceSalesCopy['vypni-hlavu']}/>;
}
