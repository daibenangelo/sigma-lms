-- Add viewed_items column to user_course_progress table
ALTER TABLE public.user_course_progress 
ADD COLUMN viewed_items TEXT[] NOT NULL DEFAULT '{}';

-- Update existing records to have empty viewed_items array
UPDATE public.user_course_progress 
SET viewed_items = '{}' 
WHERE viewed_items IS NULL;

-- Create index for better performance on viewed_items queries
CREATE INDEX idx_user_course_progress_viewed_items ON public.user_course_progress USING GIN(viewed_items);
