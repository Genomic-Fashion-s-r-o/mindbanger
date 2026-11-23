import Link from '@/components/client/PortalLink';
import PortalElement from '@/components/client/PortalElement';
import Image from 'next/image';

type Props = {
  href?: string;
  account?: boolean;
  inverse?: boolean;
  className?: string;
};

export default function BrandLogo({href='/',account=false,inverse=false,className=''}:Props) {
  return <Link href={href} className={['mindbanger-wordmark',inverse?'mindbanger-wordmark-inverse':'',className].filter(Boolean).join(' ')} aria-label="Mindbanger – domov"><Image className="mindbanger-brand-symbol" src="/mindbanger-gold-logo.png" width={52} height={52} alt=""/><span className="mindbanger-brand-copy">mindbanger<PortalElement as="small">{account?'PRIESTOR PRE VÁS':'MGR. MIROSLAV JOBUS'}</PortalElement></span></Link>;
}
