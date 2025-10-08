"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';

export interface CourseProgress {
  id: string;
  user_id: string;
  course_slug: string;
  completed_items: string[];
  viewed_items: string[];
  progress_percentage: number;
  last_updated: string;
}

export function useCourseProgress(courseSlug?: string) {
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch progress from database
  const fetchProgress = useCallback(async () => {
    if (!user || !courseSlug) {
      setLoading(false);
      return;
    }

    try {
      // Try user_course_progress first, then fallback to user_progress
      let data = null;
      let error = null;

      // Try user_course_progress table
      const { data: courseProgressData, error: courseProgressError } = await supabase
        .from('user_course_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_slug', courseSlug)
        .maybeSingle();

      if (courseProgressError && courseProgressError.code === 'PGRST205') {
        // Table doesn't exist, try user_progress
        console.warn('[useCourseProgress] user_course_progress table not found, trying user_progress');
        const { data: userProgressData, error: userProgressError } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_slug', courseSlug)
          .maybeSingle();
        
        data = userProgressData;
        error = userProgressError;
      } else {
        data = courseProgressData;
        error = courseProgressError;
      }

      if (error && error.code !== 'PGRST116') {
        console.warn('[useCourseProgress] Progress fetch skipped (table missing or unavailable):', error);
        setProgress(null);
        return;
      }

      // Ensure viewed_items exists (fallback for older schema)
      const progressData = data ? {
        ...data,
        viewed_items: data.viewed_items || []
      } : null;

      setProgress(progressData);
    } catch (err) {
      console.warn('[useCourseProgress] Error fetching progress:', err);
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [user, courseSlug]);

  // Save progress to database
  const saveProgress = useCallback(async (completedItems: string[], totalItems: number, viewedItems?: string[]) => {
    if (!user || !courseSlug) return;

    try {
      const progressPercentage = totalItems > 0 ? Math.round((completedItems.length / totalItems) * 100) : 0;
      const currentViewedItems = viewedItems || progress?.viewed_items || [];

      // Prepare upsert data
      let upsertData: any = {
        user_id: user.id,
        course_slug: courseSlug,
        completed_items: completedItems,
        progress_percentage: progressPercentage,
        last_updated: new Date().toISOString()
      };

      // Include viewed_items if available
      if (currentViewedItems.length > 0 || progress?.viewed_items) {
        upsertData.viewed_items = currentViewedItems;
      }

      // Try user_course_progress first, then fallback to user_progress
      let error = null;

      // Try user_course_progress table
      const { error: courseProgressError } = await supabase
        .from('user_course_progress')
        .upsert(upsertData, {
          onConflict: 'user_id,course_slug'
        });

      if (courseProgressError && courseProgressError.code === 'PGRST205') {
        // Table doesn't exist, try user_progress
        console.warn('[useCourseProgress] user_course_progress table not found, trying user_progress');
        
        // Remove viewed_items for user_progress table if it doesn't have that column
        const userProgressData = { ...upsertData };
        delete userProgressData.viewed_items;
        
        const { error: userProgressError } = await supabase
          .from('user_progress')
          .upsert(userProgressData, {
            onConflict: 'user_id,course_slug'
          });
        
        error = userProgressError;
      } else {
        error = courseProgressError;
      }

      if (error) {
        console.warn('[useCourseProgress] Progress save failed:', error);
        return false;
      }

      setProgress(prev => ({
        id: prev?.id || '',
        user_id: user.id,
        course_slug: courseSlug,
        completed_items: completedItems,
        viewed_items: currentViewedItems,
        progress_percentage: progressPercentage,
        last_updated: new Date().toISOString()
      }));

      return true;
    } catch (err) {
      console.warn('[useCourseProgress] Error saving progress:', err);
      return false;
    }
  }, [user, courseSlug, progress]);

  // Mark item as completed
  const markItemCompleted = useCallback(async (itemSlug: string, totalItems: number) => {
    if (!user || !courseSlug) return;

    const currentCompleted = progress?.completed_items || [];
    if (currentCompleted.includes(itemSlug)) return; // Already completed

    const newCompleted = [...currentCompleted, itemSlug];
    return await saveProgress(newCompleted, totalItems);
  }, [user, courseSlug, progress, saveProgress]);

  // Mark item as viewed
  const markItemViewed = useCallback(async (itemSlug: string, totalItems: number) => {
    if (!user || !courseSlug) return;

    const currentViewed = progress?.viewed_items || [];
    if (currentViewed.includes(itemSlug)) return; // Already viewed

    const newViewed = [...currentViewed, itemSlug];
    const currentCompleted = progress?.completed_items || [];
    return await saveProgress(currentCompleted, totalItems, newViewed);
  }, [user, courseSlug, progress, saveProgress]);

  // Get completion status
  const isItemCompleted = useCallback((itemSlug: string) => {
    return progress?.completed_items?.includes(itemSlug) || false;
  }, [progress]);

  // Get viewed status
  const isItemViewed = useCallback((itemSlug: string) => {
    return progress?.viewed_items?.includes(itemSlug) || false;
  }, [progress]);

  // Get progress stats
  const getProgressStats = useCallback(() => {
    if (!progress) return { completed: 0, total: 0, percentage: 0 };
    
    return {
      completed: progress.completed_items.length,
      total: progress.completed_items.length, // This will be updated when we have total items
      percentage: progress.progress_percentage
    };
  }, [progress]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return {
    progress,
    loading,
    error,
    markItemCompleted,
    markItemViewed,
    isItemCompleted,
    isItemViewed,
    saveProgress,
    getProgressStats,
    refetch: fetchProgress
  };
}
