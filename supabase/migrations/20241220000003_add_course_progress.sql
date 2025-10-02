-- Create user_course_progress table
CREATE TABLE public.user_course_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  course_slug TEXT NOT NULL,
  completed_items TEXT[] NOT NULL DEFAULT '{}',
  progress_percentage INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, course_slug)
);

-- Enable RLS
ALTER TABLE public.user_course_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own course progress
CREATE POLICY "Users can view own course progress" ON public.user_course_progress
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own course progress
CREATE POLICY "Users can insert own course progress" ON public.user_course_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own course progress
CREATE POLICY "Users can update own course progress" ON public.user_course_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own course progress
CREATE POLICY "Users can delete own course progress" ON public.user_course_progress
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_user_course_progress_user_id ON public.user_course_progress(user_id);
CREATE INDEX idx_user_course_progress_course_slug ON public.user_course_progress(course_slug);
CREATE INDEX idx_user_course_progress_last_updated ON public.user_course_progress(last_updated);
