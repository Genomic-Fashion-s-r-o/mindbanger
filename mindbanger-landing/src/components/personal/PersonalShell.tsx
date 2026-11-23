import PortalElement from '@/components/client/PortalElement';
import RelatedServices from './RelatedServices';
import BrandLogo from '@/components/BrandLogo';
import Link from '@/components/client/PortalLink';
import { BookingSettings } from '@/lib/booking/model';
import PageShare from './PageShare';
import { localizedPath } from '@/lib/site-locale';
import LanguageSwitcher from '@/components/LanguageSwitcher';
export function PersonalHeader({ locale }: {
    locale: 'sk' | 'cs' | 'en';
}) {
    const cs = locale === 'cs', p = (path: string) => localizedPath(path, locale);
    return <PortalElement as="header" className="personal-header"><BrandLogo href={p('/')}/><PortalElement as="nav" aria-label={cs ? 'Hlavní navigace' : 'Hlavná navigácia'}><PortalElement as="a" href={p('/#o-mne')}>{cs ? 'O mně' : 'O mne'}</PortalElement><PortalElement as="a" href={p('/#sluzby')}>{cs ? 'Témata k rozhovoru' : 'Témy na rozhovor'}</PortalElement><PortalElement as="a" href={p('/#cennik')}>{cs ? 'Ceník' : 'Cenník'}</PortalElement><Link href={p('/ucet')}>{cs ? 'Můj účet' : 'Môj účet'}</Link><Link className="personal-button small" href={p('/rezervacia')}>{cs ? 'Vybrat termín' : 'Vybrať termín'} <PortalElement as="span" aria-hidden="true">↗</PortalElement></Link></PortalElement><LanguageSwitcher /><PageShare compact/><PortalElement as="details" className="personal-mobile-menu"><PortalElement as="summary">Menu</PortalElement><PortalElement as="nav" aria-label={cs ? 'Mobilní navigace' : 'Mobilná navigácia'}><PortalElement as="a" href={p('/#sluzby')}>{cs ? 'Témata k rozhovoru' : 'Témy na rozhovor'}</PortalElement><PortalElement as="a" href={p('/#o-mne')}>{cs ? 'O mně' : 'O mne'}</PortalElement><PortalElement as="a" href={p('/#cennik')}>{cs ? 'Ceník' : 'Cenník'}</PortalElement><PortalElement as="a" href={p('/#kontakt')}>Kontakt</PortalElement><Link href={p('/ucet')}>{cs ? 'Můj účet' : 'Môj účet'}</Link></PortalElement></PortalElement></PortalElement>;
}
export function PersonalFooter({ settings, showPhone = false }: {
    settings: BookingSettings;
    showPhone?: boolean;
}) {
    const cs = settings.locale === 'cs', p = (path: string) => localizedPath(path, settings.locale);
    return <PortalElement as="footer" className="personal-footer"><PortalElement as="div"><BrandLogo href={p('/')}/><PortalElement as="p">{cs ? 'Individuální online koučink · setkání a balíčky' : 'Individuálny online coaching · stretnutia a balíčky'}</PortalElement>{settings.provider && <PortalElement as="p">{settings.provider}{settings.companyId && ` · IČO ${settings.companyId}`} · DIČ 2023282558<PortalElement as="br"/>{cs ? 'Dodavatel není plátcem DPH.' : 'Dodávateľ nie je platiteľom DPH.'}</PortalElement>}{settings.registeredAddress && <PortalElement as="p">{settings.registeredAddress}</PortalElement>}{settings.registration && <PortalElement as="p">{settings.registration}</PortalElement>}{settings.email && <PortalElement as="p"><PortalElement as="a" href={`mailto:${settings.email}`}>{settings.email}</PortalElement></PortalElement>}{showPhone && <PortalElement as="p"><PortalElement as="a" href="tel:+421948074767">+421 948 074 767</PortalElement></PortalElement>}</PortalElement><PortalElement as="div" className="personal-footer-links"><Link href={p('/moj-pristup')}>{cs ? 'Můj přístup a metody' : 'Môj prístup a metódy'}</Link><Link href={p('/podmienky')}>{cs ? 'Podmínky setkání' : 'Podmienky stretnutí'}</Link><Link href={p('/ochrana-udajov')}>{cs ? 'Ochrana osobních údajů' : 'Ochrana osobných údajov'}</Link><Link href={p('/cookies')}>Cookies</Link><Link href={p('/ucet/rezervacie')}>{cs ? 'Odstoupit od smlouvy' : 'Odstúpiť od zmluvy'}</Link><PortalElement as="a" href="https://www.soi.sk/" target="_blank" rel="noopener noreferrer">{cs ? 'Orgán dohledu: Slovenská obchodní inspekce' : 'Orgán dohľadu: Slovenská obchodná inšpekcia'}</PortalElement></PortalElement><PortalElement as="p" className="personal-disclaimer">{cs ? 'Poskytované služby mají nezdravotnický charakter. Nejsou zdravotní péčí, psychologickou diagnostikou, psychologickým poradenstvím ani psychoterapií. Nenahrazují odbornou diagnostiku nebo léčbu.' : 'Poskytované služby majú nezdravotnícky charakter. Nie sú zdravotnou starostlivosťou, psychologickou diagnostikou, psychologickým poradenstvom ani psychoterapiou. Nenahrádzajú odbornú diagnostiku alebo liečbu.'}</PortalElement><PortalElement as="small">© {new Date().getFullYear()} Mgr. Miroslav Jobus</PortalElement></PortalElement>;
}
export function PersonalShell({ settings, children, currentServiceId }: {
    settings: BookingSettings;
    children: React.ReactNode;
    currentServiceId?: string;
}) {
    return <PortalElement as="div" className="personal-site"><PortalElement as="a" className="personal-skip" href="#obsah">{settings.locale === 'cs' ? 'Přeskočit na obsah' : 'Preskočiť na obsah'}</PortalElement><PersonalHeader locale={settings.locale}/>{children}{currentServiceId && <RelatedServices settings={settings} currentServiceId={currentServiceId}/>}<PageShare /><PersonalFooter settings={settings} showPhone={settings.locale === 'sk' && currentServiceId === 'opora-pocas-liecby'}/></PortalElement>;
}
