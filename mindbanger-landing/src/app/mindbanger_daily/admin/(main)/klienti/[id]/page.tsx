import {notFound} from 'next/navigation';
import {z} from 'zod';
import MfaLock from '@/components/admin/AdminDashboard';
import CoachingClientCard from '@/components/admin/CoachingClientCard';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!z.uuid().safeParse(id).success)notFound();return <MfaLock><CoachingClientCard user={id}/></MfaLock>;}
