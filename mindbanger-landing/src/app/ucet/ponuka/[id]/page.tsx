import { z } from 'zod';
import { notFound } from 'next/navigation';
import { requireClient } from '@/lib/client-context';
import { funnelView } from '@/lib/member-funnels/store';
import FunnelOffer from '@/components/member-funnels/FunnelOffer';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!z.uuid().safeParse(id).success)notFound();const context=await requireClient();return <FunnelOffer initial={await funnelView(context.user.id,id)}/>;}
