"use client";

import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';

interface UseStackBlitzSupabaseSaveOptions {
  projectId: string;
  lessonId?: string;
  vm?: any;
}

export function useStackBlitzSupabaseSave({ projectId, lessonId, vm }: UseStackBlitzSupabaseSaveOptions) {
  const { user } = useAuth();

  // Save current filesystem snapshot to Supabase
  const saveSnapshot = useCallback(async () => {
    if (!user) {
      console.warn('User not authenticated, cannot save to Supabase');
      return false;
    }

    if (!vm || typeof vm.getFsSnapshot !== 'function') {
      console.warn('StackBlitz VM not available or getFsSnapshot not supported');
      return false;
    }

    try {
      const files = await vm.getFsSnapshot();
      
      // Prepare metadata
      const metadata = {
        savedAt: new Date().toISOString(),
        projectId,
        fileCount: Object.keys(files).length,
        userAgent: navigator.userAgent
      };

      // Save to Supabase
      const { error } = await supabase
        .from('user_stackblitz_progress')
        .upsert({
          user_id: user.id,
          project_id: projectId,
          lesson_id: lessonId,
          files: files,
          metadata: metadata,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to save StackBlitz snapshot to Supabase:', error);
        return false;
      }
      
      console.log(`[StackBlitz] Saved snapshot for project ${projectId} to Supabase`);
      return true;
    } catch (error) {
      console.error('Failed to save StackBlitz snapshot:', error);
      return false;
    }
  }, [user, vm, projectId, lessonId]);

  // Restore filesystem snapshot from Supabase
  const restoreSnapshot = useCallback(async () => {
    if (!user) {
      console.warn('User not authenticated, cannot restore from Supabase');
      return false;
    }

    if (!vm || typeof vm.applyFsDiff !== 'function') {
      console.warn('StackBlitz VM not available or applyFsDiff not supported');
      return false;
    }

    try {
      // Get snapshot from Supabase
      const { data, error } = await supabase
        .from('user_stackblitz_progress')
        .select('files, metadata')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .single();

      if (error || !data) {
        console.log(`[StackBlitz] No snapshot found for project ${projectId} in Supabase`);
        return false;
      }

      const files = data.files;
      await vm.applyFsDiff({ create: files, destroy: [] });
      
      console.log(`[StackBlitz] Restored snapshot for project ${projectId} from Supabase`);
      return true;
    } catch (error) {
      console.error('Failed to restore StackBlitz snapshot:', error);
      return false;
    }
  }, [user, vm, projectId]);

  // Check if snapshot exists in Supabase
  const hasSnapshot = useCallback(async () => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('user_stackblitz_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .single();

      return !error && !!data;
    } catch (e) {
      return false;
    }
  }, [user, projectId]);

  // Get snapshot metadata from Supabase
  const getSnapshotMetadata = useCallback(async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('user_stackblitz_progress')
        .select('metadata, updated_at')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .single();

      if (error || !data) return null;

      return {
        ...data.metadata,
        updatedAt: data.updated_at
      };
    } catch (e) {
      return null;
    }
  }, [user, projectId]);

  // Auto-save setup (call this when VM is ready)
  const setupAutoSave = useCallback((vmInstance: any) => {
    if (vmInstance && typeof vmInstance.onFsChange === 'function') {
      vmInstance.onFsChange(async () => {
        console.log(`[StackBlitz] Files changed for project ${projectId}, auto-saving to Supabase...`);
        await saveSnapshot();
      });
    }
  }, [projectId, saveSnapshot]);

  // Get all user's StackBlitz progress
  const getAllProgress = useCallback(async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('user_stackblitz_progress')
        .select('project_id, lesson_id, metadata, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Failed to get StackBlitz progress:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get StackBlitz progress:', error);
      return [];
    }
  }, [user]);

  // Delete a specific snapshot
  const deleteSnapshot = useCallback(async () => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_stackblitz_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('project_id', projectId);

      if (error) {
        console.error('Failed to delete StackBlitz snapshot:', error);
        return false;
      }

      console.log(`[StackBlitz] Deleted snapshot for project ${projectId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete StackBlitz snapshot:', error);
      return false;
    }
  }, [user, projectId]);

  return {
    saveSnapshot,
    restoreSnapshot,
    hasSnapshot,
    getSnapshotMetadata,
    setupAutoSave,
    getAllProgress,
    deleteSnapshot
  };
}
