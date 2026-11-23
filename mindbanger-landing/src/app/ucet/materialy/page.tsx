import PortalElement from '@/components/client/PortalElement';
import { requireClient } from '@/lib/client-context';
import { createClient } from '@/lib/supabase-server';
import { getSecureAudioUrl } from '@/lib/cloudflare-r2';
import Link from '@/components/client/PortalLink';
import { memberMaterials } from '@/lib/member-funnels/store';
import '@/components/programs/online-programs.css';
export default async function Page() {
    const { user } = await requireClient(), db = await createClient();
    const { data, error } = await db.from('individual_recordings').select('id,title,audio_url,created_at').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error)
        throw new Error('Materiály sa nepodarilo načítať.');
    const [records, bonuses] = await Promise.all([Promise.all((data || []).map(async (r) => ({ ...r, url: await getSecureAudioUrl(r.audio_url) }))), memberMaterials(user.id)]);
    return <><PortalElement as="header" className="client-page-heading"><PortalElement as="div"><PortalElement as="p" className="client-eyebrow">TVOJ PRIESTOR V MINDBANGERI</PortalElement><PortalElement as="h1">Moje <PortalElement as="em">materiály.</PortalElement></PortalElement><PortalElement as="p">Bonusy zdarma a osobné nahrávky, ku ktorým sa môžeš vracať.</PortalElement></PortalElement></PortalElement>
 {bonuses.length > 0 && <PortalElement as="section" className="op op-stack" style={{ marginBottom: 32 }}><PortalElement as="h2">Moje bonusy zdarma</PortalElement>{bonuses.map(b => <PortalElement as="article" className="op-panel op-row op-between" key={b.id}><PortalElement as="div"><PortalElement as="h3">{b.title}</PortalElement><PortalElement as="p">{b.description}</PortalElement></PortalElement><Link className="op-button op-primary" href={'/ucet/materialy/' + b.id}>Otvoriť materiál</Link></PortalElement>)}</PortalElement>}
 {records.map(r => <PortalElement as="article" key={r.id} className="client-card client-material"><PortalElement as="h2">{r.title}</PortalElement><PortalElement as="audio" controls preload="none" src={r.url} aria-label={r.title}/></PortalElement>)}
 {!records.length && !bonuses.length && <PortalElement as="section" className="client-card client-empty"><PortalElement as="h2">Zatiaľ tu nie sú žiadne materiály.</PortalElement><PortalElement as="p">Keď si odomkneš bonus alebo ti sprístupním osobnú nahrávku, nájdeš ich tu.</PortalElement></PortalElement>}</>;
}
