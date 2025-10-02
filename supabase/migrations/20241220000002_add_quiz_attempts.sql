-- Create user_quiz_attempts table for Contentful-based quizzes
CREATE TABLE public.user_quiz_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  quiz_slug TEXT NOT NULL,
  quiz_title TEXT NOT NULL,
  answers JSONB NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  score_percentage INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  time_spent_seconds INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own quiz attempts
CREATE POLICY "Users can view own quiz attempts" ON public.user_quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own quiz attempts
CREATE POLICY "Users can insert own quiz attempts" ON public.user_quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own quiz attempts
CREATE POLICY "Users can update own quiz attempts" ON public.user_quiz_attempts
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own quiz attempts
CREATE POLICY "Users can delete own quiz attempts" ON public.user_quiz_attempts
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_user_quiz_attempts_user_id ON public.user_quiz_attempts(user_id);
CREATE INDEX idx_user_quiz_attempts_quiz_slug ON public.user_quiz_attempts(quiz_slug);
CREATE INDEX idx_user_quiz_attempts_completed_at ON public.user_quiz_attempts(completed_at);
