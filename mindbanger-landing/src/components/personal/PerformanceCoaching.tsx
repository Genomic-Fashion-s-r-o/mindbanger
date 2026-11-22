import type { BookingSettings, Service } from '@/lib/booking/model';
import ServiceSalesPage from './ServiceSalesPage';
import { serviceSalesCopy } from './service-sales-copy';

export const performanceDescription = 'Myseľ víťaza: individuálna mentálna príprava s Miroslavom Jobusom. Zvládanie tlaku, sústredenie, návrat po chybe a vlastná rutina pred výkonom.';

export default function PerformanceCoaching({service,settings}:{service:Service;settings:BookingSettings}) {
  return <ServiceSalesPage service={service} settings={settings} copy={serviceSalesCopy['mentalny-trening']}/>;
}
