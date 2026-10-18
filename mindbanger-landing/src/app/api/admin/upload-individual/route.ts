import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { sendEmail } from '@/lib/email';
import webpush from 'web-push';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;



if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:miroslav.jobus@gmail.com',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  },
});

import { checkAdminAuth } from '@/lib/auth-admin';

export async function POST(request: Request) {
  if (!(await checkAdminAuth())) return NextResponse.json({ error: 'Unauthorized Admin' }, { status: 401 });
    try {
        const body = await request.json();
        const { publicUrl, title, userId, userEmail, userName } = body;

        if (!publicUrl || !title || !userId) {
            return NextResponse.json({ error: 'ChĂ˝bajĂş parametre formulĂˇra' }, { status: 400 });
        }

        const uniqueFilename = publicUrl;


        // Save DB Record
        const { data: insertedRec, error: dbErr } = await supabaseAdmin.from('individual_recordings').insert({
            user_id: userId,
            title: title,
            audio_url: uniqueFilename
        }).select().single();

        if (dbErr) throw dbErr;

        // Send Email
        if (userEmail) {
            try {
                await sendEmail({
                    from: "Mindbanger <noreply@mindbanger.com>",
                    to: userEmail,
                    subject: "Máte novú individuálnu nahrávku!",
                    html: `
                        <div style="font-family: sans-serif; padding: 20px; color: #333;">
                            <h2>Získali ste novú nahrávku!</h2>
                            <p>Ahoj ${userName || ""},</p>
                            <p>Do vášho profilu v aplikácii Mindbanger bola pridaná nová súkromná nahrávka s názvom: <strong>${title}</strong>.</p>
                            <p><a href="https://mindbanger.com/mindbanger_daily/app/my-audio" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Prehrať nahrávku v appke</a></p>
                            <p style="margin-top: 30px; font-size: 12px; color: #666;">Táto nahrávka je dostupná len pre váš profil.</p>
                        </div>
                    `
                });
            } catch(e) {
                console.error("Email send error:", e);
            }
        }

        // Send Push Notification
        try {
            const { data: subs } = await supabaseAdmin.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', userId);
            
            if (subs && subs.length > 0) {
                const payload = JSON.stringify({
                    title: 'Nová osobná nahrávka!',
                    body: `Práve pre vás bola nahratá nová nahrávka: ${title}`,
                    url: '/mindbanger_daily/app/my-audio'
                });

                for (const subRow of subs) {
                    try {
                        const sub = { endpoint: subRow.endpoint, keys: { p256dh: subRow.p256dh, auth: subRow.auth } };
                        await webpush.sendNotification(sub, payload);
                    } catch(pushErr) {
                        console.error('Push error for sub', pushErr);
                    }
                }
            }
        } catch(e) {
             console.error("Push query error:", e);
        }

        return NextResponse.json({ success: true, recording: insertedRec });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message || 'Nastala neoÄŤakĂˇvanĂˇ chyba.' }, { status: 500 });
    }
}
