import { timingSafeEqual } from 'node:crypto';
import { processReaderWelcomes } from '@/lib/readers/welcome';
import { processReaders } from '@/lib/readers/campaigns';
import { json,failure } from '@/lib/readers/http';
export const maxDuration=60;
export async function GET(request:Request){const expected=process.env.CRON_SECRET,actual=request.headers.get('authorization');if(!expected||!actual||Buffer.byteLength(actual)!==Buffer.byteLength('Bearer '+expected)||!timingSafeEqual(Buffer.from(actual),Buffer.from('Bearer '+expected)))return json({error:'unauthorized'},401);try{const [readers,welcomes]=await Promise.all([processReaders(),processReaderWelcomes()]);return json({...readers,...welcomes});}catch(e){return failure(e);}}
