"use client";

import { useCallback } from 'react';

interface UseStackBlitzSaveOptions {
  projectId: string;
  vm?: any;
}

export function useStackBlitzSave({ projectId, vm }: UseStackBlitzSaveOptions) {
  // Save current filesystem snapshot
  const saveSnapshot = useCallback(async () => {
    if (!vm || typeof vm.getFsSnapshot !== 'function') {
      console.warn('StackBlitz VM not available or getFsSnapshot not supported');
      return false;
    }

    try {
      const files = await vm.getFsSnapshot();
      const serializedFiles = JSON.stringify(files);
      
      // Store snapshot
      localStorage.setItem(`stackblitz-snapshot-${projectId}`, serializedFiles);
      
      // Store metadata
      const metadata = {
        savedAt: new Date().toISOString(),
        projectId,
        fileCount: Object.keys(files).length
      };
      localStorage.setItem(`stackblitz-metadata-${projectId}`, JSON.stringify(metadata));
      
      console.log(`[StackBlitz] Saved snapshot for project ${projectId}`);
      return true;
    } catch (error) {
      console.error('Failed to save StackBlitz snapshot:', error);
      return false;
    }
  }, [vm, projectId]);

  // Restore filesystem snapshot
  const restoreSnapshot = useCallback(async () => {
    if (!vm || typeof vm.applyFsDiff !== 'function') {
      console.warn('StackBlitz VM not available or applyFsDiff not supported');
      return false;
    }

    try {
      const serializedFiles = localStorage.getItem(`stackblitz-snapshot-${projectId}`);
      if (!serializedFiles) {
        console.log(`[StackBlitz] No snapshot found for project ${projectId}`);
        return false;
      }

      const files = JSON.parse(serializedFiles);
      await vm.applyFsDiff({ create: files, destroy: [] });
      
      console.log(`[StackBlitz] Restored snapshot for project ${projectId}`);
      return true;
    } catch (error) {
      console.error('Failed to restore StackBlitz snapshot:', error);
      return false;
    }
  }, [vm, projectId]);

  // Check if snapshot exists
  const hasSnapshot = useCallback(() => {
    try {
      const snapshot = localStorage.getItem(`stackblitz-snapshot-${projectId}`);
      return snapshot !== null;
    } catch (e) {
      return false;
    }
  }, [projectId]);

  // Get snapshot metadata
  const getSnapshotMetadata = useCallback(() => {
    try {
      const metadata = localStorage.getItem(`stackblitz-metadata-${projectId}`);
      return metadata ? JSON.parse(metadata) : null;
    } catch (e) {
      return null;
    }
  }, [projectId]);

  // Auto-save setup (call this when VM is ready)
  const setupAutoSave = useCallback((vmInstance: any) => {
    if (vmInstance && typeof vmInstance.onFsChange === 'function') {
      vmInstance.onFsChange(async () => {
        console.log(`[StackBlitz] Files changed for project ${projectId}, auto-saving...`);
        await saveSnapshot();
      });
    }
  }, [projectId, saveSnapshot]);

  return {
    saveSnapshot,
    restoreSnapshot,
    hasSnapshot: hasSnapshot(),
    getSnapshotMetadata,
    setupAutoSave
  };
}
