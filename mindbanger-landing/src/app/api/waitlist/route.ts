import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, language = 'en' } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // Insert into waitlist table
    const { error } = await supabase
      .from('waitlist')
      .insert([
        {
          email: email.toLowerCase(),
          language: language,
          status: 'pending'
        }
      ]);

    if (error) {
      // If it's a unique constraint violation, meaning they are already on the waitlist
      if (error.code === '23505') {
         return NextResponse.json({ message: 'Already on the waitlist' }, { status: 200 });
      }
      console.error('Waitlist insert error:', error);
      return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 });
    }

    // Optional: Send a confirmation email here via Brevo if env is configured.
    // For now we just record them in DB.

    return NextResponse.json({ success: true, message: 'Successfully added to waitlist' });
  } catch (error) {
    console.error('Waitlist endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}