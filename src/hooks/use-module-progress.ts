"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';

export interface ModuleProgress {
  id: string;
  user_id: string;
  module_slug: string;
  completed_items: string[];
  viewed_items: string[];
  progress_percentage: number;
  last_updated: string;
}

export function useModuleProgress(moduleSlug?: string) {
  const [progress, setProgress] = useState<ModuleProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch progress from database
  const fetchProgress = useCallback(async () => {
    if (!user || !moduleSlug) {
      setLoading(false);
      return;
    }

    try {
      // Try user_module_progress table
      const { data, error } = await supabase
        .from('user_module_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('module_slug', moduleSlug)
        .maybeSingle();

      if (error && error.code === 'PGRST205') {
        // Table doesn't exist, return null (no progress tracking available)
        console.warn('[useModuleProgress] user_module_progress table not found, progress tracking unavailable');
        setProgress(null);
        return;
      }

      if (error && error.code !== 'PGRST116') {
        console.warn('[useModuleProgress] Progress fetch skipped (table missing or unavailable):', error);
        setProgress(null);
        return;
      }

      // Ensure viewed_items exists (fallback for older schema)
      const progressData = data ? {
        ...data,
        viewed_items: data.viewed_items || [],
        completed_items: data.completed_items || []
      } : null;

      setProgress(progressData);
    } catch (err) {
      console.warn('[useModuleProgress] Error fetching progress:', err);
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [user, moduleSlug]);

  // Save progress to database
  const saveProgress = useCallback(async (completedItems: string[], totalItems: number, viewedItems?: string[]) => {
    if (!user || !moduleSlug) return;

    try {
      // Calculate progress percentage
      const effectiveCompletedCount = completedItems.length;
      const progressPercentage = totalItems > 0 ? Math.round((effectiveCompletedCount / totalItems) * 100) : 0;

      // Prepare upsert data
      const upsertData: any = {
        user_id: user.id,
        module_slug: moduleSlug,
        completed_items: completedItems,
        viewed_items: viewedItems || progress?.viewed_items || [],
        progress_percentage: progressPercentage,
        last_updated: new Date().toISOString()
      };

      // Try user_module_progress table
      const { error } = await supabase
        .from('user_module_progress')
        .upsert(upsertData, {
          onConflict: 'user_id,module_slug'
        });

      if (error && error.code === 'PGRST205') {
        // Table doesn't exist, log warning and skip save
        console.warn('[useModuleProgress] user_module_progress table not found, progress save skipped');
        return false;
      }

      if (error) {
        console.warn('[useModuleProgress] Progress save failed:', error);
        return false;
      }

      setProgress(prev => ({
        id: prev?.id || '',
        user_id: user.id,
        module_slug: moduleSlug,
        completed_items: completedItems,
        viewed_items: viewedItems || prev?.viewed_items || [],
        progress_percentage: progressPercentage,
        last_updated: new Date().toISOString()
      }));

      return true;
    } catch (err) {
      console.warn('[useModuleProgress] Error saving progress:', err);
      return false;
    }
  }, [user, moduleSlug, progress]);

  // Mark item as completed
  const markItemCompleted = useCallback(async (itemSlug: string, totalItems: number) => {
    if (!user || !moduleSlug) return;

    const currentCompleted = progress?.completed_items || [];
    if (currentCompleted.includes(itemSlug)) return; // Already completed

    const newCompleted = [...currentCompleted, itemSlug];
    return await saveProgress(newCompleted, totalItems);
  }, [user, moduleSlug, progress, saveProgress]);

  // Mark item as viewed
  const markItemViewed = useCallback(async (itemSlug: string, totalItems: number) => {
    if (!user || !moduleSlug) return;

    const currentViewed = progress?.viewed_items || [];
    if (currentViewed.includes(itemSlug)) return; // Already viewed

    const newViewed = [...currentViewed, itemSlug];
    const currentCompleted = progress?.completed_items || [];
    return await saveProgress(currentCompleted, totalItems, newViewed);
  }, [user, moduleSlug, progress, saveProgress]);

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
