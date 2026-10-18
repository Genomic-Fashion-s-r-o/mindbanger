import { createClient } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/email';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { email, orgId, inviterName, lang } = await req.json();
        const supabase = await createClient();
        
        // 1. Verify Access
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return new NextResponse('Unauthorized', { status: 401 });

        const { data: membership } = await supabase
            .from('organization_members')
            .select('role')
            .eq('organization_id', orgId)
            .eq('user_id', session.user.id)
            .in('role', ['owner', 'admin'])
            .single();

        if (!membership) return new NextResponse('Forbidden', { status: 403 });

        // 2. Get Org Name
        const { data: org } = await supabase.from('organizations').select('name').eq('id', orgId).single();

        // 3. Send Email
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mindbanger.com';
        const inviteLink = `${siteUrl}/mindbanger_daily/login?email=${encodeURIComponent(email)}`;
        
        const subject = lang === 'sk' 
            ? `Pozvánka do tímu ${org?.name} na Mindbanger` 
            : `Invitation to join ${org?.name} on Mindbanger`;

        const html = lang === 'sk' ? `
            <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #0f172a; margin-bottom: 24px;">Pozvánka do Mindbanger B2B</h1>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
                    <strong>${inviterName}</strong> vás pozval(a) do organizácie <strong>${org?.name}</strong>.
                </p>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
                    Získajte prístup k denným mentálnym cvičeniam (Daily Reset) a exkluzívnemu firemnému obsahu, ktorý podporí vašu produktivitu a duševnú pohodu.
                </p>
                <div style="text-align: center; margin-bottom: 32px;">
                    <a href="${inviteLink}" style="display: inline-block; padding: 14px 28px; background-color: #f59e0b; color: #0f172a; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                        Pripojte sa do aplikácie
                    </a>
                </div>
                <p style="font-size: 14px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                    Ak už máte účet na Mindbangeri, stačí sa prihlásiť týmto emailom a prístup sa vám automaticky aktivuje.<br>
                    Ak účet nemáte, vytvorte si ho pomocou tohto emailu.
                </p>
            </div>
        ` : `
            <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #0f172a; margin-bottom: 24px;">Invitation to Mindbanger B2B</h1>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
                    <strong>${inviterName}</strong> has invited you to join <strong>${org?.name}</strong>.
                </p>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
                    Get access to daily mental exercises (Daily Reset) and exclusive corporate content to boost your productivity and well-being.
                </p>
                <div style="text-align: center; margin-bottom: 32px;">
                    <a href="${inviteLink}" style="display: inline-block; padding: 14px 28px; background-color: #f59e0b; color: #0f172a; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                        Accept Invitation
                    </a>
                </div>
                <p style="font-size: 14px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                    If you already have a Mindbanger account, simply log in with this email to activate your access.<br>
                    If not, please create an account using this email address.
                </p>
            </div>
        `;

        await sendEmail({
            to: email,
            subject,
            html
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('Invite Error:', e);
        return new NextResponse(e.message, { status: 500 });
    }
}
