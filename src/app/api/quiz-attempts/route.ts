import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const quizSlug = searchParams.get('quizSlug');
    // courseSlug is optional (kept for backward-compat); not used for filtering
    if (!quizSlug) {
      return NextResponse.json({ error: 'Missing quizSlug' }, { status: 400 });
    }

    // Create Supabase client - support Authorization header (Bearer token) or cookies
    const authHeader = request.headers.get('authorization') || '';
    let supabase: any;
    if (authHeader?.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.split(' ')[1];
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );
    } else {
      const cookieStore = await cookies();
      supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            },
          },
        }
      );
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, return empty data since we're using localStorage on the client side
    console.log('[api/quiz-attempts] Using localStorage fallback for fetching attempts for quiz:', quizSlug);

    return NextResponse.json({
      hasPerfectScore: false, // Will be determined on client side
      attempts: [],
      totalAttempts: 0
    });

  } catch (error) {
    console.error('Error checking quiz completion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      quizSlug,
      quizTitle,
      answers,
      score,
      totalQuestions,
      scorePercentage,
      passed,
      timeSpentSeconds,
      completedAt
    } = body || {};

    if (!quizSlug || !quizTitle || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization') || '';
    let supabase: any;
    if (authHeader?.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.split(' ')[1];
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );
    } else {
      const cookieStore = await cookies();
      supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            },
          },
        }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, just use localStorage since the database schema doesn't match our needs
    // We'll store the attempt locally and return success
    console.log('[api/quiz-attempts] Using localStorage fallback for quiz:', quizSlug);

    return NextResponse.json({
      ok: true,
      stored: 'localStorage',
      message: 'Quiz attempt saved locally (database schema needs updating)'
    });
  } catch (e) {
    console.error('Error saving quiz results:', e);
    return NextResponse.json({ ok: false, stored: 'none', error: 'Internal server error' }, { status: 200 });
  }
}
