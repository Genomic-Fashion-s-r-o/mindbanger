import PortalElement from '@/components/client/PortalElement';
import { meetingProvider } from '@/lib/booking/meeting-link';
export default function MeetingLink({ url }: {
    url: string;
}) {
    const provider = meetingProvider(url);
    return provider ? <PortalElement as="div" className="client-meeting"><PortalElement as="a" className="client-button" href={url} target="_blank" rel="noopener noreferrer">Pripojiť sa cez {provider} ↗</PortalElement><PortalElement as="p">Súkromný odkaz pre toto sedenie. Nezdieľaj ho s ďalšími osobami.</PortalElement></PortalElement> : null;
}
