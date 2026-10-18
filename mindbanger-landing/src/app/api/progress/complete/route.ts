import { DAILY_ENABLED } from '@/lib/client-platform';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  if (!DAILY_ENABLED) return NextResponse.json({ error: 'Program Mindbanger Daily je momentálne vypnutý.' }, { status: 410 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return new Response('Unauthorized', { status: 401 });

  let text: any;
  try {
     text = await request.json();
  } catch (e) {
     return new Response('Invalid JSON', { status: 400 });
  }

  const { signalId } = text;

  if (!signalId) {
      // If we don't have signalId, maybe just mark "daily usage" generally? 
      // User requested "streak logic". Usually tied to specific content or just "login".
      // Assuming signalId keeps it tied to content.
      return NextResponse.json({ error: "Missing signalId" }, { status: 400 });
  }

  // 1. Record completion
  const { error } = await supabase.from('user_progress').upsert({
    user_id: user.id,
    signal_id: signalId,
    completed_at: new Date().toISOString()
  }, { onConflict: 'user_id, signal_id' });

  if (error) {
      console.error("Progress Error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2. Calculate Streak
  // Fetch all completion dates for this user
  const { data: progress } = await supabase
    .from('user_progress')
    .select('completed_at')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false });

  let streak = 0;
  if (progress && progress.length > 0) {
      // Normalize dates to YYYY-MM-DD to ignore time
      const uniqueDates = Array.from(new Set(progress.map((p: any) => p.completed_at.split('T')[0])));
      // Sort descending
      uniqueDates.sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime());

      // Check generic day sequence
      // Note: uniqueDates are now strings "YYYY-MM-DD"
      
      let currentDate = new Date(uniqueDates[0] as string);
      
      // Check if the most recent completion is today or yesterday.
      // If it's older than yesterday, streak is broken -> 0 (or 1 if we count strictly consecutive ending today).
      // Logic: Streak is "consecutive days ending today or yesterday".
      
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const lastCompletion = new Date(uniqueDates[0] as string);
      lastCompletion.setHours(0,0,0,0);
      
      const diffTime = Math.abs(today.getTime() - lastCompletion.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays <= 1) {
          streak = 1;
          for (let i = 1; i < uniqueDates.length; i++) {
              const prevDate = new Date(uniqueDates[i] as string);
              const prevDiff = Math.abs(currentDate.getTime() - prevDate.getTime());
              const prevDiffDays = Math.ceil(prevDiff / (1000 * 60 * 60 * 24));

              if (prevDiffDays === 1) {
                  streak++;
                  currentDate = prevDate;
              } else {
                  break;
              }
          }
      }
  }
  
  // Optionally Update Profile with new streak
  await supabase.from('profiles').update({ current_streak: streak }).eq('id', user.id);

  return NextResponse.json({ success: true, streak });
}
