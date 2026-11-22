import PortalElement from '@/components/client/PortalElement';
import Link from '@/components/client/PortalLink';
import { z } from 'zod';
import { requireClient } from '@/lib/client-context';
import { clientProgramView, ProgramError } from '@/lib/online-programs/store';
import ProgramClient from '@/components/programs/ProgramClient';
export default async function Page({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const context = await requireClient(), { id } = await params;
    if (!z.uuid().safeParse(id).success)
        return <PortalElement as="div" className="client-notice">Program sa nenašiel.</PortalElement>;
    try {
        return <ProgramClient initial={await clientProgramView(context.user.id, id)}/>;
    }
    catch (error) {
        if (!(error instanceof ProgramError))
            throw error;
        return <PortalElement as="div" className="op op-stack"><PortalElement as="h1">Program teraz nie je dostupný</PortalElement><PortalElement as="p">{error.message}</PortalElement><Link href="/ucet/produkty">Moje programy</Link></PortalElement>;
    }
}
