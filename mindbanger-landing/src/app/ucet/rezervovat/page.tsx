import { requireClient } from '@/lib/client-context';
import { getBookingSettings } from '@/lib/booking/store';
import ClientBookingCalendar from '@/components/client/ClientBookingCalendar';
export default async function Page({ searchParams }: { searchParams: Promise<{sluzba?:string}> }) {
  const [context,{settings,installed},query]=await Promise.all([requireClient(),getBookingSettings(),searchParams]);
  return <><header className="client-page-heading"><div><p className="client-eyebrow">ŽIVÉ ONLINE STRETNUTIE</p><h1>Vyberte si <em>svoj čas.</em></h1><p>Najprv služba, potom termín. Bez online platby.</p></div></header>{installed&&settings.enabled?<ClientBookingCalendar settings={settings} name={context.profile?.full_name||''} email={context.user.email||''} initialService={query.sluzba}/>:<section className="client-card client-empty"><h2>Nové termíny otvoríme <em>čoskoro.</em></h2><p>Aktuálne nie je otvorená dostupnosť na rezervovanie. Po jej nastavení sa tu zobrazia voľné dni a časy.</p>{settings.email&&<p>Kontakt: <a href={`mailto:${settings.email}`}>{settings.email}</a></p>}<p>Online platby sú vypnuté.</p></section>}</>;
}
