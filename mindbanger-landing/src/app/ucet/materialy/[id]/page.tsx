import { z } from 'zod';
import { notFound } from 'next/navigation';
import { requireClient } from '@/lib/client-context';
import { bonusMaterial } from '@/lib/member-funnels/store';
import BonusReader from '@/components/member-funnels/BonusReader';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!z.uuid().safeParse(id).success)notFound();const context=await requireClient(),{access,asset,fallback}=await bonusMaterial(context.user.id,id);return <BonusReader id={id} title={access.title} description={access.description} mime={asset.mime} fallback={fallback}/>;}
