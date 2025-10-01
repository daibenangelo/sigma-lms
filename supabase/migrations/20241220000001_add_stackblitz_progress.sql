-- Create user_stackblitz_progress table
CREATE TABLE public.user_stackblitz_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  files JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- Enable RLS
ALTER TABLE public.user_stackblitz_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own progress
CREATE POLICY "Users can view own stackblitz progress" ON public.user_stackblitz_progress
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own stackblitz progress" ON public.user_stackblitz_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own stackblitz progress" ON public.user_stackblitz_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own progress
CREATE POLICY "Users can delete own stackblitz progress" ON public.user_stackblitz_progress
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_user_stackblitz_progress_user_id ON public.user_stackblitz_progress(user_id);
CREATE INDEX idx_user_stackblitz_progress_project_id ON public.user_stackblitz_progress(project_id);
CREATE INDEX idx_user_stackblitz_progress_lesson_id ON public.user_stackblitz_progress(lesson_id);
