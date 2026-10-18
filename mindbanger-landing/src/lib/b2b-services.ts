import { createAdminClient } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';

export async function sendB2BInviteEmail(email: string, orgId: string, inviterName: string, lang: string = 'sk') {
    const supabase = await createAdminClient();
    const { data: org } = await supabase.from('organizations').select('name').eq('id', orgId).single();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mindbanger.com';
    const inviteLink = `${siteUrl}/mindbanger_daily/login?email=${encodeURIComponent(email)}`;
    
    const subject = lang === 'sk' 
        ? `Pozvánka do tímu ${org?.name || 'Mindbanger B2B'} na Mindbanger` 
        : `Invitation to join ${org?.name || 'Mindbanger B2B'} on Mindbanger`;

    const html = lang === 'sk' ? `
        <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #0f172a; margin-bottom: 24px;">Pozvánka do Mindbanger B2B</h1>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
                <strong>${inviterName}</strong> vás pozval(a) do organizácie <strong>${org?.name || 'Mindbanger B2B'}</strong>.
            </p>
            <div style="text-align: center; margin-bottom: 32px;">
                <a href="${inviteLink}" style="display: inline-block; padding: 14px 28px; background-color: #f59e0b; color: #0f172a; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Pripojte sa do aplikácie
                </a>
            </div>
        </div>
    ` : `
        <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #0f172a; margin-bottom: 24px;">Invitation to Mindbanger B2B</h1>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
                <strong>${inviterName}</strong> has invited you to join <strong>${org?.name || 'Mindbanger B2B'}</strong>.
            </p>
            <div style="text-align: center; margin-bottom: 32px;">
                <a href="${inviteLink}" style="display: inline-block; padding: 14px 28px; background-color: #f59e0b; color: #0f172a; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Accept Invitation
                </a>
            </div>
        </div>
    `;

    return sendEmail({ to: email, subject, html });
}
