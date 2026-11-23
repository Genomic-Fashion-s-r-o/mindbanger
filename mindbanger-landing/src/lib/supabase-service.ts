// Service Client for Admin/System tasks
import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Only use this server-side! Exposing service key to client is a security risk.
export const getServiceSupabase = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must be in env file
    
    if (!supabaseServiceKey) {
        throw new Error('Supabase Service Role Key is missing from env variables.');
    }
    
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
};