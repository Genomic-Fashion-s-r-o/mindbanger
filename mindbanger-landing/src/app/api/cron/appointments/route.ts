import {purgeTimeRequests} from '@/lib/time-request-store';
import {processTimeRequestMail} from '@/lib/time-request-mail';
import {processCardMail} from '@/lib/coaching-cards';
import {purgeSupportContexts} from '@/lib/booking/support-context-store';
import { after, NextResponse } from 'next/server';
import { purgeSiteRequestTotals } from '@/lib/site-request-counter';
import { timingSafeEqual } from 'node:crypto';
import { processBookingMail } from '@/lib/booking/notifications';
import { reconcileAuthorizations } from '@/lib/booking/authorization';
import { processVideoJobs } from '@/lib/booking/video-jobs';
import { processDocumentJobs } from '@/lib/booking/documents';
import { purgeAttribution } from '@/lib/marketing-attribution-server';
import { purgeProgramInterest } from '@/lib/program-interest';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const incoming = request.headers.get('authorization') || '';
  const expected = `Bearer ${secret}`;
  if (!secret || incoming.length !== expected.length || !timingSafeEqual(Buffer.from(incoming), Buffer.from(expected))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  after(purgeSiteRequestTotals);
  try { await purgeSupportContexts();await purgeTimeRequests();let timeRequestMail:{processed:number}|{error:string};try{timeRequestMail=await processTimeRequestMail();}catch{timeRequestMail={error:'unavailable'};console.warn('time_request_mail_maintenance');}const authorizations=await reconcileAuthorizations();const documents=await processDocumentJobs();const video=await processVideoJobs();const mail=await processBookingMail();await purgeAttribution();await purgeProgramInterest();await processCardMail();return NextResponse.json({authorizations,documents,video,...mail,timeRequestMail}); }
  catch { return NextResponse.json({ error: 'Appointment maintenance unavailable' }, { status: 503 }); }
}
