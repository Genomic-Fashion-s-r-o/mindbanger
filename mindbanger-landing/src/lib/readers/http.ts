import 'server-only';
import { NextResponse } from 'next/server';
import { ReaderError } from './store';
import { ProgramError } from '@/lib/online-programs/store';
export const noStore={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
export const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:noStore});
export function failure(error:unknown){if(error instanceof ReaderError)return json({error:error.code},error.status);if(error instanceof ProgramError)return json({error:error.message},error.status);console.error('Reader request failed',error instanceof Error?error.name:'unknown');return json({error:'reader_unavailable'},503);}
export function origin(request:Request){if(request.headers.get('origin')!==new URL(request.url).origin)throw new ReaderError('reader_bad_origin',403);}
export async function body(request:Request,max=5000){if(Number(request.headers.get('content-length'))>max)throw new ReaderError('reader_invalid_input',413);const text=await request.text();if(new TextEncoder().encode(text).length>max)throw new ReaderError('reader_invalid_input',413);try{return JSON.parse(text)as unknown;}catch{throw new ReaderError('reader_invalid_input');}}
