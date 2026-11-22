import { NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export async function verifyVercelCron(req: Request) {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
      return false;
  }

  const token = authHeader.replace('Bearer ', '');

  // 1. Try simple CRON_SECRET validation first (recommended for Vercel)
  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) {
      return true;
  }

  // 2. Fallback to Vercel OIDC/JWT verification
  try {
      const jwks = createRemoteJWKSet(new URL('https://vercel.com/api/oidc/jwks'));
      const options: any = { issuer: 'https://vercel.com' };
      
      if (!process.env.VERCEL_PROJECT_ID) {
          console.error('Missing VERCEL_PROJECT_ID for Cron OIDC verification');
          return false;
      }
      
      options.audience = process.env.VERCEL_PROJECT_ID;

      await jwtVerify(token, jwks, options);
      return true;
  } catch (jwtError) {
      console.error('CRON OIDC validation failed', jwtError);
      return false;
  }
}