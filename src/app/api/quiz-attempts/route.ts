import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const quizSlug = searchParams.get('quizSlug');
    const courseSlug = searchParams.get('courseSlug');

    if (!quizSlug || !courseSlug) {
      return NextResponse.json({ error: 'Missing quizSlug or courseSlug' }, { status: 400 });
    }

    // Create Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
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

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get quiz attempts for this user and quiz
    const { data: attempts, error } = await supabase
      .from('user_quiz_attempts')
      .select('score, score_percentage, passed')
      .eq('user_id', user.id)
      .eq('quiz_slug', quizSlug);

    if (error) {
      console.error('Failed to fetch quiz attempts:', error);
      return NextResponse.json({ error: 'Failed to fetch quiz attempts' }, { status: 500 });
    }

    // Check if any attempt has a perfect score (100%)
    const hasPerfectScore = attempts?.some(attempt => attempt.score_percentage === 100) || false;

    return NextResponse.json({
      hasPerfectScore,
      attempts: attempts || []
    });

  } catch (error) {
    console.error('Error checking quiz completion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
