-- Create user_tutorial_progress table
CREATE TABLE public.user_tutorial_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  tutorial_slug TEXT NOT NULL,
  course_slug TEXT,
  code TEXT NOT NULL DEFAULT '',
  language TEXT DEFAULT 'html',
  last_saved TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, tutorial_slug)
);

-- Enable RLS
ALTER TABLE public.user_tutorial_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own tutorial progress
CREATE POLICY "Users can view own tutorial progress" ON public.user_tutorial_progress
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own tutorial progress
CREATE POLICY "Users can insert own tutorial progress" ON public.user_tutorial_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own tutorial progress
CREATE POLICY "Users can update own tutorial progress" ON public.user_tutorial_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own tutorial progress
CREATE POLICY "Users can delete own tutorial progress" ON public.user_tutorial_progress
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_user_tutorial_progress_user_id ON public.user_tutorial_progress(user_id);
CREATE INDEX idx_user_tutorial_progress_tutorial_slug ON public.user_tutorial_progress(tutorial_slug);
CREATE INDEX idx_user_tutorial_progress_course_slug ON public.user_tutorial_progress(course_slug);
CREATE INDEX idx_user_tutorial_progress_last_saved ON public.user_tutorial_progress(last_saved);
