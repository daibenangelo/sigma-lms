"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronUp,
  ChevronDown,
  Save,
  Upload,
  AlertCircle,
  CheckCircle,
  Loader2,
  Code
} from "lucide-react";
import StackBlitzSDK from '@stackblitz/sdk';

interface StackBlitzToggleProps {
  document?: any;
  className?: string;
}

export function StackBlitzToggle({ document, className = "" }: StackBlitzToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [hasSnapshot, setHasSnapshot] = useState(false);
  const [stackblitzUrl, setStackblitzUrl] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [vm, setVm] = useState<any>(null);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Extract StackBlitz URL from fullCodeSolution RichText field
  useEffect(() => {
    if (document && document.content) {
      console.log('[StackBlitz] Processing fullCodeSolution document:', document);
      console.log('[StackBlitz] Document content:', document.content);

      // Look for StackBlitz URLs in the RichText content
      const extractUrls = (content: any[]): string[] => {
        const urls: string[] = [];

        const processNode = (node: any) => {
          if (node.nodeType === 'paragraph' && node.content) {
            node.content.forEach((textNode: any) => {
              if (textNode.nodeType === 'text' && textNode.value) {
                const text = textNode.value;
                // Look for StackBlitz URLs
                const stackblitzMatch = text.match(/https:\/\/stackblitz\.com\/[^\s]+/g);
                if (stackblitzMatch) {
                  urls.push(...stackblitzMatch);
                }
              }
            });
          }

          // Also check for hyperlink nodes
          if (node.nodeType === 'hyperlink' && node.data && node.data.uri) {
            const url = node.data.uri;
            if (url.includes('stackblitz.com')) {
              urls.push(url);
            }
          }

          // Recursively process nested content
          if (node.content && Array.isArray(node.content)) {
            node.content.forEach(processNode);
          }
        };

        content.forEach(processNode);
        return urls;
      };

      const urls = extractUrls(document.content);
      console.log('[StackBlitz] Extracted URLs:', urls);

      if (urls.length > 0) {
        const url = urls[0];
        console.log('[StackBlitz] Using StackBlitz URL:', url);

        // Convert to embed URL with proper parameters
        try {
          const embedUrl = new URL(url);
          embedUrl.searchParams.set('embed', '1');
          embedUrl.searchParams.set('hideNavigation', '1');
          embedUrl.searchParams.set('hideDevTools', '0');
          embedUrl.searchParams.set('view', 'both');
          embedUrl.searchParams.set('ctl', '1'); // Enable controls
          embedUrl.searchParams.set('devtoolsheight', '33'); // Set dev tools height

          // Remove any existing file parameter that might cause issues
          embedUrl.searchParams.delete('file');

          setStackblitzUrl(embedUrl.toString());
          setProjectId(url.split('/').pop() || 'default');
          console.log('[StackBlitz] Final embed URL:', embedUrl.toString());
        } catch (error) {
          console.error('[StackBlitz] Error creating embed URL:', error);
          // Use the original URL if embed conversion fails
          setStackblitzUrl(url);
          setProjectId(url.split('/').pop() || 'default');
        }
      } else {
        console.log('[StackBlitz] No StackBlitz URLs found in fullCodeSolution');
        // Don't render the component if no URL is found
        setStackblitzUrl('');
        setProjectId('');
      }
    }
  }, [document]);

  // Check for existing snapshot on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      const snapshot = localStorage.getItem(`stackblitz-snapshot-${projectId}`);
      setHasSnapshot(!!snapshot);
      
      // Load last save time
      const timestamp = localStorage.getItem(`stackblitz-snapshot-${projectId}-timestamp`);
      if (timestamp) {
        setLastSaveTime(new Date(parseInt(timestamp)));
      }
    }
  }, [projectId]);

  // Timer to update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  // Embed StackBlitz project when URL is available and panel is open
  useEffect(() => {
    if (stackblitzUrl && isOpen && !isEmbedded) {
      console.log('[StackBlitz] Embedding project with URL:', stackblitzUrl);
      
      try {
        // Extract project ID from URL
        const url = new URL(stackblitzUrl);
        const projectId = url.pathname.split('/').pop() || 'default';
        
        console.log('[StackBlitz] Project ID:', projectId);
        
        // Embed the project using StackBlitz SDK
        const embedPromise = StackBlitzSDK.embedProjectId('stackblitz-editor', projectId, {
          openFile: 'index.html',
          view: 'both',
          hideNavigation: true,
          hideDevTools: false,
          devToolsHeight: 33
        });
        
        embedPromise.then((vmInstance: any) => {
          console.log('[StackBlitz] Project embedded successfully, VM instance:', vmInstance);
          setVm(vmInstance);
          setIsEmbedded(true);
        }).catch((error: any) => {
          console.error('[StackBlitz] Failed to embed project:', error);
        });
        
      } catch (error) {
        console.error('[StackBlitz] Error embedding project:', error);
      }
    }
  }, [stackblitzUrl, isOpen, isEmbedded]);

  // Save function using StackBlitz SDK getFsSnapshot() with proper VM instance
  const saveSnapshot = async () => {
    try {
      setSaveStatus('saving');
      console.log('[StackBlitz] Attempting to save using getFsSnapshot()...');
      
      // Check if we have a VM instance
      if (!vm) {
        console.log('[StackBlitz] No VM instance available');
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
        return;
      }
      
      console.log('[StackBlitz] Using VM instance:', vm);
      console.log('[StackBlitz] VM instance type:', typeof vm);
      console.log('[StackBlitz] VM instance keys:', Object.keys(vm));
      console.log('[StackBlitz] VM getFsSnapshot method:', typeof vm.getFsSnapshot);
      console.log('[StackBlitz] VM applyFsDiff method:', typeof vm.applyFsDiff);
      
      let vmSnapshot = null;
      let vmAccessSuccess = false;
      
      try {
        console.log('[StackBlitz] Calling vm.getFsSnapshot()...');
        
        // Try to get current file state - check if there are any unsaved changes
        console.log('[StackBlitz] VM editor object:', vm.editor);
        console.log('[StackBlitz] VM preview object:', vm.preview);
        
        // Check if there's a way to get current file content
        if (vm.editor && typeof vm.editor.getFileContent === 'function') {
          console.log('[StackBlitz] Trying to get current file content from editor...');
          try {
            const currentContent = await vm.editor.getFileContent();
            console.log('[StackBlitz] Current editor content:', currentContent);
          } catch (e) {
            console.log('[StackBlitz] getFileContent not available:', e);
          }
        }
        
        // Try to trigger a save in the editor before getting snapshot
        if (vm.editor && typeof vm.editor.save === 'function') {
          console.log('[StackBlitz] Trying to save editor changes...');
          try {
            await vm.editor.save();
            console.log('[StackBlitz] Editor save successful');
          } catch (e) {
            console.log('[StackBlitz] Editor save failed:', e);
          }
        }
        
        // Try to get the current state of all files
        if (vm.editor && typeof vm.editor.getFiles === 'function') {
          console.log('[StackBlitz] Trying to get current files from editor...');
          try {
            const currentFiles = await vm.editor.getFiles();
            console.log('[StackBlitz] Current editor files:', currentFiles);
          } catch (e) {
            console.log('[StackBlitz] getFiles not available:', e);
          }
        }
        
        vmSnapshot = await vm.getFsSnapshot();
        vmAccessSuccess = true;
        console.log('[StackBlitz] getFsSnapshot() successful:', vmSnapshot);
        
        // Check if this is the same as the original project files
        console.log('[StackBlitz] Snapshot keys:', Object.keys(vmSnapshot));
        console.log('[StackBlitz] First file content preview:', Object.values(vmSnapshot)[0]);
        
      } catch (snapshotError) {
        console.warn('[StackBlitz] getFsSnapshot() failed:', snapshotError);
        console.log('[StackBlitz] Available methods on VM:', Object.getOwnPropertyNames(vm));
        console.log('[StackBlitz] VM prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(vm)));
      }
      
      console.log('[StackBlitz] Final VM access result:', { vmAccessSuccess, hasSnapshot: !!vmSnapshot });
      
      // Create snapshot with VM data if available
      const snapshot = {
        timestamp: Date.now(),
        projectId: projectId,
        saved: true,
        vmSnapshot: vmSnapshot,
        data: {
          message: "Snapshot saved at " + new Date().toLocaleString(),
          url: stackblitzUrl,
          hasVmData: vmAccessSuccess,
          note: vmAccessSuccess ? "VM snapshot captured using getFsSnapshot()" : "VM access failed"
        }
      };
      
      // Save to localStorage
      localStorage.setItem(`stackblitz-snapshot-${projectId}`, JSON.stringify(snapshot));
      const currentTime = Date.now();
      localStorage.setItem(`stackblitz-snapshot-${projectId}-timestamp`, currentTime.toString());
      
      setHasSnapshot(true);
      setLastSaveTime(new Date(currentTime));
      setSaveStatus('saved');
      console.log('[StackBlitz] Snapshot saved to localStorage:', snapshot);
      
      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
      
    } catch (error) {
      console.error('[StackBlitz] Save failed:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Restore function using StackBlitz SDK applyFsDiff()
  const restoreSnapshot = async () => {
    try {
      setSaveStatus('saving');
      console.log('[StackBlitz] Attempting to restore using applyFsDiff()...');
      
      // Check if we have a VM instance
      if (!vm) {
        console.log('[StackBlitz] No VM instance available');
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
        return;
      }
      
      const snapshotData = localStorage.getItem(`stackblitz-snapshot-${projectId}`);
      if (!snapshotData) {
        console.log('[StackBlitz] No snapshot found');
        setSaveStatus('error');
        return;
      }

      const snapshot = JSON.parse(snapshotData);
      console.log('[StackBlitz] Restoring snapshot:', snapshot);
      
      if (!snapshot.vmSnapshot) {
        console.log('[StackBlitz] No VM snapshot data available');
        alert(`No VM snapshot data available for restoration.\nSnapshot saved at: ${new Date(snapshot.timestamp).toLocaleString()}`);
        setSaveStatus('error');
        return;
      }
      
      let restoreSuccess = false;
      
      console.log('[StackBlitz] VM instance for restore:', vm);
      console.log('[StackBlitz] VM getFsSnapshot method for restore:', typeof vm.getFsSnapshot);
      console.log('[StackBlitz] VM applyFsDiff method for restore:', typeof vm.applyFsDiff);
      
      try {
        console.log('[StackBlitz] Converting snapshot to diff format...');
        
        // Convert snapshot to diff format
        const diff = {
          create: snapshot.vmSnapshot,
          destroy: [] // No files to destroy, just restore all files
        };
        
        console.log('[StackBlitz] Diff object:', diff);
        console.log('[StackBlitz] Calling vm.applyFsDiff() with diff...');
        await vm.applyFsDiff(diff);
        restoreSuccess = true;
        console.log('[StackBlitz] applyFsDiff() successful - code restored!');
      } catch (applyError) {
        console.warn('[StackBlitz] applyFsDiff() failed:', applyError);
        console.log('[StackBlitz] Available methods on VM for restore:', Object.getOwnPropertyNames(vm));
        console.log('[StackBlitz] VM prototype methods for restore:', Object.getOwnPropertyNames(Object.getPrototypeOf(vm)));
      }
      
      if (restoreSuccess) {
        setSaveStatus('saved');
        console.log('[StackBlitz] Code restored successfully using applyFsDiff()');
        alert(`Code has been restored to the state saved at: ${new Date(snapshot.timestamp).toLocaleString()}\n\nThe editor should now show your saved changes.`);
      } else {
        setSaveStatus('error');
        console.log('[StackBlitz] VM access failed - could not restore code');
        alert(`Restore attempted for snapshot saved at: ${new Date(snapshot.timestamp).toLocaleString()}\n\nNote: VM access failed - code could not be restored.`);
      }
      
      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
      
    } catch (error) {
      console.error('[StackBlitz] Restore failed:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'saved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Code className="h-4 w-4" />;
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (saveStatus) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Saved!';
      case 'error':
        return 'Error';
      default:
        if (lastSaveTime) {
          const diffMs = currentTime.getTime() - lastSaveTime.getTime();
          const diffSeconds = Math.floor(diffMs / 1000);
          const diffMinutes = Math.floor(diffMs / (1000 * 60));
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          
          if (diffDays > 0) {
            return `Saved ${diffDays}d ago`;
          } else if (diffHours > 0) {
            return `Saved ${diffHours}h ago`;
          } else if (diffMinutes > 0) {
            return `Saved ${diffMinutes}m ago`;
          } else if (diffSeconds > 0) {
            return `Saved ${diffSeconds}s ago`;
          } else {
            return 'Saved just now';
          }
        }
        return 'Ready';
    }
  };

  // Don't render if no URL is available
  if (!stackblitzUrl) {
    return null;
  }

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 ${className}`}>
      {/* Toggle Button */}
      <div className="flex justify-center mb-2">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-t-lg"
        >
          <Code className="h-4 w-4" />
          StackBlitz Editor
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>

      {/* Editor Panel */}
      {isOpen && (
        <div className="bg-white border-t border-gray-200 shadow-lg">
          <div className="h-[50vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                <span className="font-medium">Code Editor</span>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Status */}
                <div className="flex items-center gap-1 text-sm">
                  {getStatusIcon()}
                  <span>{getStatusText()}</span>
                </div>
                
                {/* Save/Restore Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={saveSnapshot}
                    disabled={saveStatus === 'saving'}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    <Save className="h-3 w-3" />
                    Save
                  </Button>
                  
                  {hasSnapshot && (
                    <Button
                      onClick={restoreSnapshot}
                      disabled={saveStatus === 'saving'}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <Upload className="h-3 w-3" />
                      Restore
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => {
                      console.log('[StackBlitz] Debug info...');
                      
                      // Check if we're in a browser environment
                      if (typeof window === 'undefined') {
                        console.log('[StackBlitz] Not in browser environment');
                        return;
                      }
                      
                      console.log('[StackBlitz] Browser environment:', {
                        window: typeof window,
                        document: typeof document,
                        localStorage: typeof localStorage,
                        projectId: projectId,
                        stackblitzUrl: stackblitzUrl
                      });
                      
                      // Try to find iframe without complex DOM queries
                      try {
                        const iframe = document.querySelector('iframe[src*="stackblitz"]');
                        if (iframe) {
                          console.log('[StackBlitz] Iframe found:', iframe.src);
                          console.log('[StackBlitz] Iframe accessible:', !!iframe.contentWindow);
                        } else {
                          console.log('[StackBlitz] No StackBlitz iframe found');
                        }
                      } catch (e) {
                        console.log('[StackBlitz] Iframe detection failed:', e);
                      }
                      
                      // Show localStorage info
                      const snapshot = localStorage.getItem(`stackblitz-snapshot-${projectId}`);
                      if (snapshot) {
                        console.log('[StackBlitz] Existing snapshot:', JSON.parse(snapshot));
                      } else {
                        console.log('[StackBlitz] No existing snapshot');
                      }
                    }}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    <AlertCircle className="h-3 w-3" />
                    Debug
                  </Button>
                </div>
              </div>
            </div>

            {/* StackBlitz Editor */}
            <div className="flex-1 relative">
              <div 
                id="stackblitz-editor" 
                className="w-full h-full"
                style={{ minHeight: '300px' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}