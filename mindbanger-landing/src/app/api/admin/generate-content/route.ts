import { checkAdminAuth } from '@/lib/auth-admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { generateMasterContent } from '@/lib/content-engine/openai';
import { MasterContent } from '@/lib/content-engine/schemas';

// Hardcoded for now. Move to DB/Env.
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
           try {
             cookiesToSet.forEach(({ name, value, options }) => 
               cookieStore.set(name, value, options)
             )
           } catch {}
        },
      },
    }
  );

  // Auth check
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!(await checkAdminAuth())) { return NextResponse.json({ error: 'Unauthorized Admin' }, { status: 401 }); }

  try {
    const body = await request.json();
    const { date, language: requestedLang = 'en', themeHint } = body; // requestedLang is what the UI wants back

    if (!date) return NextResponse.json({ error: 'Date required' }, { status: 400 });
    
    // 1. Generate TRILINGUAL content
    console.log(`Generating Master Content for ${date} (Hint: ${themeHint || 'None'})...`);
    const master = await generateMasterContent(date, themeHint);

    // 2. Prepare DB Upserts for EN, SK, CS
    const languages = ['en', 'sk', 'cs'] as const;
    const upserts = languages.map(lang => {
        // Dynamic key access with type assertion
        const suffix = lang as 'en' | 'sk' | 'cs';
        // Note: We need to cast master to any to access dynamic properties because TS might not infer specific keys easily without extensive mapped types
        const m = master as any; 

        return {
            date: date,
            language: lang,
            theme: m[`theme_title_${suffix}`],
            title: m[`theme_title_${suffix}`], 
            focus_text: m[`daily_vibe_${suffix}`], 
            affirmation: m[`affirmation_${suffix}`],
            
            // Map strictly to Spoken Script for TTS
            script: m[`script_${suffix}`] || m[`text_of_day_${suffix}`], 
            signal_text: m[`script_${suffix}`] || m[`text_of_day_${suffix}`], // Keep sync for now as UI conflates them
            
            meditation_text: m[`meditation_${suffix}`], 
            
            status: 'generated',
            generation_metadata: {
                // Store the Full Article/Text in metadata so it's not lost
                text_of_day: m[`text_of_day_${suffix}`],
                
                microstep: m[`microstep_${suffix}`],
                meditation: m[`meditation_${suffix}`],
                journal: m[`journal_question_${suffix}`],
                keywords: m[`keywords_${suffix}`],
                visual_prompt: lang === 'en' ? master.image_prompt_en : undefined,
                season: master.season,
                zodiac: master.zodiac,
                moon_phase: master.moon_phase
            }
        };
    });

    // 3. Save to DB (All 3 languages)
    const { error: dbError } = await supabase
        .from('daily_signals')
        .upsert(upserts, { onConflict: 'date, language' });

    if (dbError) {
        console.error('DB Upsert Error:', dbError);
        throw new Error('Failed to save content to database: ' + dbError.message);
    }

    // 4. Return the requested language to the UI for immediate preview
    const responsePayload = upserts.find(u => u.language === requestedLang) || upserts[0];

    return NextResponse.json(responsePayload);

  } catch (err: any) {
    console.error('Master Content Generation Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
