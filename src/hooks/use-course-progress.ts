"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';

export interface CourseProgress {
  id: string;
  user_id: string;
  course_slug: string;
  completed_items: string[];
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
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_slug', courseSlug)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Failed to fetch course progress:', error);
        setError('Failed to load progress');
        return;
      }

      setProgress(data);
    } catch (err) {
      console.error('Error fetching course progress:', err);
      setError('An error occurred while loading progress');
    } finally {
      setLoading(false);
    }
  }, [user, courseSlug]);

  // Save progress to database
  const saveProgress = useCallback(async (completedItems: string[], totalItems: number) => {
    if (!user || !courseSlug) return;

    try {
      const progressPercentage = totalItems > 0 ? Math.round((completedItems.length / totalItems) * 100) : 0;

      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          course_slug: courseSlug,
          completed_items: completedItems,
          progress_percentage: progressPercentage,
          last_updated: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to save course progress:', error);
        return false;
      }

      // Update local state
      setProgress(prev => ({
        id: prev?.id || '',
        user_id: user.id,
        course_slug: courseSlug,
        completed_items: completedItems,
        progress_percentage: progressPercentage,
        last_updated: new Date().toISOString()
      }));

      return true;
    } catch (err) {
      console.error('Error saving course progress:', err);
      return false;
    }
  }, [user, courseSlug]);

  // Mark item as completed
  const markItemCompleted = useCallback(async (itemSlug: string, totalItems: number) => {
    if (!user || !courseSlug) return;

    const currentCompleted = progress?.completed_items || [];
    if (currentCompleted.includes(itemSlug)) return; // Already completed

    const newCompleted = [...currentCompleted, itemSlug];
    return await saveProgress(newCompleted, totalItems);
  }, [user, courseSlug, progress, saveProgress]);

  // Get completion status
  const isItemCompleted = useCallback((itemSlug: string) => {
    return progress?.completed_items?.includes(itemSlug) || false;
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
    isItemCompleted,
    saveProgress,
    getProgressStats,
    refetch: fetchProgress
  };
}
