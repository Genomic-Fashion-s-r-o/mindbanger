import type { BookingSettings, Service } from '@/lib/booking/model';
import ServiceSalesPage from './ServiceSalesPage';
import { serviceSalesCopy } from './service-sales-copy';

export const relaxationDescription = 'Hlboká relaxácia s Miroslavom Jobusom. Individuálne vedený oddych online, v tvojom tempe. Priestor spomaliť, vnímať seba a vyskúšať si vlastný spôsob uvoľnenia.';

export default function DeepRelaxation({service,settings}:{service:Service;settings:BookingSettings}) {
  return <ServiceSalesPage service={service} settings={settings} copy={serviceSalesCopy['relaxacia']}/>;
}
