import CertificationMark from './CertificationMark';
import { expertiseParagraphs, qualificationHeading, qualificationOrganisations } from './qualification-content';

export function Qualifications({ locale = 'sk', compact = false }: { locale?: 'sk' | 'cs' | 'en'; compact?: boolean }) {
  const cs = locale === 'cs';
  const paragraphs = cs ? [
    'Mé vzdělávání zahrnuje mimo jiné zahraniční certifikaci Teenage Life Coach a Hypnoterapie.',
    'Při spolupráci propojuji zkušenosti, které jsem získal nejen jako pedagog, sportovní trenér a kouč, ale také jako obchodník, podnikatel, tvůrce aplikačních řešení a rodič dnes již dospělých dětí.',
  ] : expertiseParagraphs;
  return <section id="certifikacie" className="personal-section personal-qualifications" aria-labelledby="qualifications-title">
    <p className="personal-eyebrow">{cs?'VZDĚLÁVÁNÍ A CERTIFIKACE':'VZDELÁVANIE A CERTIFIKÁCIE'}</p>
    <h2 id="qualifications-title">{cs?'Odbornost, kterou':'Odbornosť, ktorú'} <em>{cs?'dále rozvíjím.':'ďalej rozvíjam.'}</em></h2>
    {(compact ? paragraphs.slice(0,1) : paragraphs).map(text => <p key={text}>{text}</p>)}
    <h3>{cs?'Certifikační organizace a odborná členství':qualificationHeading}</h3>
    <div className="qualification-logos">{qualificationOrganisations.map(org => <figure key={org.name}><CertificationMark organisation={org} /><figcaption>{org.label}</figcaption></figure>)}</div>
    <p className="qualification-note">{cs?'Certifikace dalšího vzdělávání nepředstavují zdravotnické oprávnění. Služby mají nezdravotnický charakter.':'Certifikácie ďalšieho vzdelávania nepredstavujú zdravotnícke oprávnenie. Služby majú nezdravotnícky charakter.'}</p>
  </section>;
}
