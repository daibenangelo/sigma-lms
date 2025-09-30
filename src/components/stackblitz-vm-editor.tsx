"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Code, Save, RotateCcw, Download, Upload } from "lucide-react";

interface StackBlitzVMEditorProps {
  projectUrl: string;
  projectId: string;
  course?: string;
  className?: string;
}

export function StackBlitzVMEditor({ projectUrl, projectId, course, className = "" }: StackBlitzVMEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [vm, setVm] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [snapshotStatus, setSnapshotStatus] = useState<{
    hasSnapshot: boolean;
    lastSaved?: string;
    fileCount?: number;
  }>({ hasSnapshot: false });

  // Check for existing snapshot on mount
  useEffect(() => {
    const checkSnapshot = () => {
      try {
        const snapshot = localStorage.getItem(`stackblitz-snapshot-${projectId}`);
        const metadata = localStorage.getItem(`stackblitz-metadata-${projectId}`);
        
        if (snapshot && metadata) {
          const metadataObj = JSON.parse(metadata);
          setSnapshotStatus({
            hasSnapshot: true,
            lastSaved: metadataObj.savedAt,
            fileCount: metadataObj.fileCount
          });
        }
      } catch (e) {
        console.warn('Failed to check snapshot status:', e);
      }
    };

    checkSnapshot();
  }, [projectId]);

  // Initialize StackBlitz VM
  const initializeVM = useCallback(async () => {
    setIsLoading(true);
    try {
      // Dynamic import to avoid SSR issues
      const { createStackBlitzProject } = await import('@stackblitz/sdk');
      
      // Create StackBlitz project
      const project = await createStackBlitzProject({
        title: `Challenge - ${projectId}`,
        description: `Interactive coding challenge for ${course || 'development'}`,
        template: 'node',
        files: await getInitialFiles(),
        dependencies: {
          // Add any dependencies here
        }
      });

      // Get the VM instance
      const vmInstance = await project.getVM();
      setVm(vmInstance);

      // Auto-restore snapshot if available
      if (snapshotStatus.hasSnapshot) {
        await restoreSnapshot(vmInstance);
      }

    } catch (error) {
      console.error('Failed to initialize StackBlitz VM:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, course, snapshotStatus.hasSnapshot]);

  // Get initial files (either from snapshot or defaults)
  const getInitialFiles = async () => {
    try {
      const snapshot = localStorage.getItem(`stackblitz-snapshot-${projectId}`);
      if (snapshot) {
        return JSON.parse(snapshot);
      }
    } catch (e) {
      console.warn('Failed to load snapshot, using defaults');
    }

    // Default files
    return {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Challenge</title>
</head>
<body>
    <h1>Hello World!</h1>
    <p>Start coding your challenge here.</p>
</body>
</html>`,
      'package.json': JSON.stringify({
        name: 'challenge',
        version: '1.0.0',
        scripts: {
          dev: 'vite',
          build: 'vite build'
        },
        devDependencies: {
          vite: '^4.0.0'
        }
      }, null, 2)
    };
  };

  // Save filesystem snapshot
  const saveSnapshot = useCallback(async () => {
    if (!vm) return;

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
      
      // Update status
      setSnapshotStatus({
        hasSnapshot: true,
        lastSaved: metadata.savedAt,
        fileCount: metadata.fileCount
      });
      
      console.log(`[StackBlitz] Saved snapshot for project ${projectId}`);
    } catch (error) {
      console.error('Failed to save snapshot:', error);
    }
  }, [vm, projectId]);

  // Restore filesystem snapshot
  const restoreSnapshot = useCallback(async (vmInstance?: any) => {
    const targetVM = vmInstance || vm;
    if (!targetVM) return;

    try {
      const serializedFiles = localStorage.getItem(`stackblitz-snapshot-${projectId}`);
      if (!serializedFiles) {
        console.log(`[StackBlitz] No snapshot found for project ${projectId}`);
        return;
      }

      const files = JSON.parse(serializedFiles);
      await targetVM.applyFsDiff({ create: files, destroy: [] });
      
      console.log(`[StackBlitz] Restored snapshot for project ${projectId}`);
    } catch (error) {
      console.error('Failed to restore snapshot:', error);
    }
  }, [vm, projectId]);

  // Download snapshot as JSON file
  const downloadSnapshot = useCallback(() => {
    try {
      const snapshot = localStorage.getItem(`stackblitz-snapshot-${projectId}`);
      if (snapshot) {
        const blob = new Blob([snapshot], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stackblitz-snapshot-${projectId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download snapshot:', error);
    }
  }, [projectId]);

  // Upload and restore snapshot from file
  const uploadSnapshot = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const files = JSON.parse(content);
        
        // Store the uploaded snapshot
        localStorage.setItem(`stackblitz-snapshot-${projectId}`, content);
        
        // Update metadata
        const metadata = {
          savedAt: new Date().toISOString(),
          projectId,
          fileCount: Object.keys(files).length
        };
        localStorage.setItem(`stackblitz-metadata-${projectId}`, JSON.stringify(metadata));
        
        // Update status
        setSnapshotStatus({
          hasSnapshot: true,
          lastSaved: metadata.savedAt,
          fileCount: metadata.fileCount
        });
        
        // Restore if VM is available
        if (vm) {
          await restoreSnapshot();
        }
        
        console.log(`[StackBlitz] Uploaded and restored snapshot for project ${projectId}`);
      } catch (error) {
        console.error('Failed to upload snapshot:', error);
      }
    };
    reader.readAsText(file);
  }, [projectId, vm, restoreSnapshot]);

  // Handle open/close
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    if (!vm) {
      initializeVM();
    }
  }, [vm, initializeVM]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  if (!isOpen) {
    return (
      <div className={`fixed right-4 bottom-4 z-40 ${className}`}>
        <Button
          onClick={handleOpen}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-lg px-4 py-2"
        >
          <Code className="h-4 w-4 mr-2" />
          Start Challenge
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Bottom Drawer */}
      <div className="fixed bottom-0 left-0 right-0 h-[50vh] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50">
        {/* Header */}
        <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-900">StackBlitz VM Editor</h3>
            {isLoading && <span className="text-sm text-gray-500">Loading...</span>}
            {snapshotStatus.hasSnapshot && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <span>•</span>
                <span>Saved {snapshotStatus.lastSaved ? 
                  new Date(snapshotStatus.lastSaved).toLocaleString() : 
                  'recently'
                }</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={saveSnapshot}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              disabled={!vm}
            >
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
            {snapshotStatus.hasSnapshot && (
              <Button
                onClick={() => restoreSnapshot()}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                disabled={!vm}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Restore
              </Button>
            )}
            <Button
              onClick={downloadSnapshot}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              disabled={!snapshotStatus.hasSnapshot}
            >
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json"
                onChange={uploadSnapshot}
                className="hidden"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                asChild
              >
                <span>
                  <Upload className="h-3 w-3 mr-1" />
                  Import
                </span>
              </Button>
            </label>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="icon"
              className="h-6 w-6"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-full">
          <div className="flex-1 p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Initializing StackBlitz VM...</p>
                </div>
              </div>
            ) : vm ? (
              <div className="h-full">
                <p className="text-sm text-gray-500 mb-4">
                  StackBlitz VM is ready! Your changes will be automatically saved to localStorage.
                </p>
                {snapshotStatus.hasSnapshot && (
                  <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
                    <p className="text-sm text-green-800">
                      <strong>Snapshot Available:</strong> {snapshotStatus.fileCount} files saved on {snapshotStatus.lastSaved}
                    </p>
                  </div>
                )}
                <div className="bg-gray-50 border rounded p-4">
                  <p className="text-sm text-gray-600">
                    The StackBlitz VM is running. You can now interact with the embedded editor above.
                    Use the Save button to persist your changes to localStorage.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-500">Failed to initialize StackBlitz VM</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
