import PortalElement from '@/components/client/PortalElement';
import ClientLanguageSwitcher from './ClientLanguageSwitcher';
import BrandLogo from '@/components/BrandLogo';
import './client-account.css';
import Link from '@/components/client/PortalLink';
import ClientNav from './ClientNav';
import ClientActions from './ClientActions';
export default function ClientShell({ name, children, locale = 'sk' }: {
    name: string;
    children: React.ReactNode;
    locale?: 'sk' | 'cs' | 'en';
}) {
    const cs = locale === 'cs', prefix = cs ? '/cz' : '';
    return <PortalElement as="div" className="client-site client-account"><PortalElement as="a" className="client-skip" href="#klientsky-obsah">{cs ? 'Přeskočit na obsah' : 'Preskočiť na obsah'}</PortalElement><PortalElement as="header" className="client-header"><BrandLogo className="client-brand" href={prefix + '/ucet'} account/><ClientNav locale={locale}/><ClientLanguageSwitcher /><PortalElement as="div" className="client-identity"><PortalElement as="span" className="client-avatar" aria-hidden="true">{name.charAt(0).toUpperCase() || 'M'}</PortalElement><PortalElement as="span">{name}</PortalElement></PortalElement></PortalElement><PortalElement as="main" id="klientsky-obsah" className="client-main">{children}</PortalElement><PortalElement as="footer" className="client-footer"><PortalElement as="div"><Link href={prefix || '/'}>Mgr. Miroslav Jobus ↗</Link><PortalElement as="p">{cs ? 'Individuální online koučink' : 'Individuálny online coaching'} · Mgr. Miroslav Jobus</PortalElement></PortalElement><PortalElement as="div" className="client-footer-links"><Link href={prefix + '/podmienky-uctu'}>{cs ? 'Podmínky účtu' : 'Podmienky účtu'}</Link><Link href={prefix + '/ochrana-udajov'}>{cs ? 'Ochrana osobních údajů' : 'Ochrana údajov'}</Link><Link href={prefix + '/ucet/materialy'}>{cs ? 'Moje materiály' : 'Moje materiály'}</Link><Link href={prefix + '/ucet/rezervacie'}>{cs ? 'Odstoupit od smlouvy' : 'Odstúpiť od zmluvy'}</Link></PortalElement><ClientActions locale={locale}/></PortalElement></PortalElement>;
}
