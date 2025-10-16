"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import {
  ChevronUp,
  ChevronDown,
  Save,
  Upload,
  AlertCircle,
  CheckCircle,
  Loader2,
  Code,
  CheckCircle as CheckCircleIcon,
  Play,
  Terminal
} from "lucide-react";
import StackBlitzSDK from '@stackblitz/sdk';
import { supabase } from '@/lib/supabase';
import { TerminalPopup } from '@/components/terminal-popup';

interface StackBlitzToggleProps {
  document?: any;
  className?: string;
  testJS?: string; // Add testJS prop
}

export function StackBlitzToggle({ document, className = "", testJS }: StackBlitzToggleProps) {
  const { user: currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [hasSnapshot, setHasSnapshot] = useState(false);
  const [stackblitzUrl, setStackblitzUrl] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [vm, setVm] = useState<any>(null);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [lastRestoreTime, setLastRestoreTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isChallenge, setIsChallenge] = useState(false);
  const [isQuiz, setIsQuiz] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionType, setCompletionType] = useState<'quiz' | 'challenge' | null>(null);
  const [hasScriptFile, setHasScriptFile] = useState<boolean>(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [scriptContent, setScriptContent] = useState('');
  const [terminalKey, setTerminalKey] = useState(0);
  const [currentFiles, setCurrentFiles] = useState<any>({});

  // Check if script.js exists in the project (for button visibility)
  const checkScriptExists = async (): Promise<boolean> => {
    try {
      console.log('[StackBlitz] Checking for script.js file...');

      // For StackBlitz projects, assume script.js exists since the user can see it in the file tree
      if (stackblitzUrl && typeof window !== 'undefined') {
        console.log('[StackBlitz] StackBlitz project detected:', stackblitzUrl);
        console.log('[StackBlitz] Current location:', window.location.href);

        // If we're in a StackBlitz project, assume script.js exists
        // The user can see script.js in the file tree, so it should exist
        console.log('[StackBlitz] Assuming script.js exists for StackBlitz projects');
        return true;
      }

      // For development environment, also assume script.js exists
      if (typeof window !== 'undefined' &&
          (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1'))) {
        console.log('[StackBlitz] Development environment detected, assuming script.js exists');
        return true;
      }

      console.log('[StackBlitz] No StackBlitz project detected');
      return false;
    } catch (error) {
      console.warn('[StackBlitz] Could not check for script.js:', error);
      return true; // Default to true for safety
    }
  };

  // Detect page type and completion status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const isChallengePage = pathname.includes('/challenge/');
      const isQuizPage = pathname.includes('/quiz/');

      setIsChallenge(isChallengePage);
      setIsQuiz(isQuizPage);

      if (isChallengePage) {
        setCompletionType('challenge');
        checkChallengeCompletion();
      } else if (isQuizPage) {
        setCompletionType('quiz');
        checkQuizCompletion();
      }
    }
  }, []);

  // Check if challenge is completed (all tests passed at some point)
  const checkChallengeCompletion = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (!currentUser) {
        console.log('[StackBlitz] No current user, cannot check completion');
        setIsCompleted(false);
        return;
      }

      const challengeSlug = window.location.pathname.split('/').pop();
      if (!challengeSlug) {
        console.log('[StackBlitz] No challenge slug found in URL');
        setIsCompleted(false);
        return;
      }

      const completedKey = `challenge-completed-${currentUser.id}-${challengeSlug}`;
      const storedValue = localStorage.getItem(completedKey);
      const isCompleted = storedValue === 'true';

      console.log('[StackBlitz] Completion check:', {
        challengeSlug,
        completedKey,
        storedValue,
        isCompleted,
        currentUserId: currentUser.id,
        currentIsCompletedState: isCompleted // Current state value
      });

      // Only update if the state is different
      setIsCompleted(isCompleted);

      // Debug: Check all challenge completion keys
      const allKeys = Object.keys(localStorage).filter(key => key.startsWith('challenge-completed'));
      console.log('[StackBlitz] All challenge completion keys:', allKeys.map(key => `${key}: ${localStorage.getItem(key)}`));
    }
  }, [currentUser]);

  // Check if quiz has perfect score
  const checkQuizCompletion = async () => {
    if (typeof window !== 'undefined') {
      try {
        const quizSlug = window.location.pathname.split('/').pop();
        const courseSlug = new URLSearchParams(window.location.search).get('course');

        if (!courseSlug) {
          setIsCompleted(false);
          return;
        }

        // Check quiz attempts for perfect score
        const response = await fetch(`/api/quiz-attempts?quizSlug=${quizSlug}&courseSlug=${courseSlug}`);
        const data = await response.json();

        // Check if any attempt has a perfect score (100%)
        const hasPerfectScore = data.attempts?.some((attempt: any) => attempt.score_percentage === 100) || false;

        if (hasPerfectScore) {
          setIsCompleted(true);
          // Store in localStorage for faster subsequent checks
          localStorage.setItem(`quiz-completed-${quizSlug}`, 'true');
          console.log('[StackBlitz] Quiz completion saved to localStorage:', quizSlug);
        } else {
          setIsCompleted(false);
        }
      } catch (error) {
        console.error('Error checking quiz completion:', error);
        setIsCompleted(false);
      }
    }
  };

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
          // Reset embedding state to allow re-embedding if document changes
          setIsEmbedded(false);
          console.log('[StackBlitz] Final embed URL:', embedUrl.toString());
        } catch (error) {
          console.error('[StackBlitz] Error creating embed URL:', error);
          // Use the original URL if embed conversion fails
          setStackblitzUrl(url);
          setProjectId(url.split('/').pop() || 'default');
          // Reset embedding state to allow re-embedding
          setIsEmbedded(false);
        }
      } else {
        console.log('[StackBlitz] No StackBlitz URLs found in fullCodeSolution');
        // Don't render the component if no URL is found
        setStackblitzUrl('');
        setProjectId('');
        // Reset embedding state
        setIsEmbedded(false);
      }
    }
  }, [document]);

  // Check for existing snapshot and script.js file on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (projectId) {
        // Check for snapshot with new key format (includes user ID)
        const currentPath = window.location.pathname;
        const activitySlug = currentPath.split('/').pop();
        const snapshotKey = currentUser
          ? `stackblitz-snapshot-${currentUser.id}-${activitySlug}`
          : `stackblitz-snapshot-${activitySlug}`;
        const snapshot = localStorage.getItem(snapshotKey);
      setHasSnapshot(!!snapshot);
      
      // Load last save time
      const timestamp = localStorage.getItem(`${snapshotKey}-timestamp`);
      if (timestamp) {
        setLastSaveTime(new Date(parseInt(timestamp)));
      }

      // Load last restore time
      const restoreTimestamp = localStorage.getItem(`${snapshotKey}-restore-timestamp`);
      if (restoreTimestamp) {
        setLastRestoreTime(new Date(parseInt(restoreTimestamp)));
      }
      }

      // Check if script.js exists in the project (for button visibility)
      checkScriptExists().then(exists => {
        setHasScriptFile(exists);
        console.log('[StackBlitz] Script.js detection result:', exists);
      });
    }
  }, [projectId, stackblitzUrl, vm, currentUser]);

  // Timer to update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  // Re-check completion status when challenge status changes or user changes
  useEffect(() => {
    if (isChallenge && currentUser) {
      console.log('[StackBlitz] Re-checking completion status for challenge');
      checkChallengeCompletion();
    }
  }, [isChallenge, currentUser, checkChallengeCompletion]);

  // Listen for item-completed events to update completion status
  useEffect(() => {
    const handleItemCompleted = (event: CustomEvent) => {
      console.log('[StackBlitz] Received item-completed event:', event.detail);
      if (isChallenge) {
        checkChallengeCompletion();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('item-completed', handleItemCompleted as EventListener);

      return () => {
        window.removeEventListener('item-completed', handleItemCompleted as EventListener);
      };
    }
  }, [isChallenge, checkChallengeCompletion]);

  // Embed StackBlitz project when URL is available (only once)
  useEffect(() => {
    if (stackblitzUrl && !isEmbedded && editorRef.current) {
      console.log('[StackBlitz] Embedding project with URL:', stackblitzUrl);
      
      try {
        // Extract project ID from URL - just the project name for embedding
        const url = new URL(stackblitzUrl);
        const projectId = url.pathname.split('/').pop() || 'default';
        
        console.log('[StackBlitz] Project ID:', projectId);
        
        // Ensure the container exists and is ready
        if (!editorRef.current) {
          console.warn('[StackBlitz] Container not ready, retrying...');
          setTimeout(() => {
            if (editorRef.current && !isEmbedded) {
              embedProject();
            }
          }, 100);
          return;
        }

        const embedProject = () => {
        // Clear the container before embedding
        if (editorRef.current) {
          editorRef.current.innerHTML = '';
        }
        
        // Embed the project using StackBlitz SDK
        const embedPromise = StackBlitzSDK.embedProjectId('stackblitz-editor', projectId, {
          openFile: 'index.html',
          hideNavigation: true,
          hideDevTools: false,
          devToolsHeight: 33
        });
        
        embedPromise.then((vmInstance: any) => {
          console.log('[StackBlitz] Project embedded successfully, VM instance:', vmInstance);

            // Add a delay to ensure the editor is fully initialized and visible
            setTimeout(() => {
              console.log('[StackBlitz] Checking if editor needs refresh...');

              // Try to refresh the editor layout
              if (vmInstance && vmInstance.editor && typeof vmInstance.editor.refresh === 'function') {
                console.log('[StackBlitz] Refreshing editor layout');
                vmInstance.editor.refresh();
              }

              // Also try to focus the editor to ensure it's active
              if (vmInstance && vmInstance.editor && typeof vmInstance.editor.focus === 'function') {
                vmInstance.editor.focus();
              }

              // Check if the iframe is properly sized
              if (typeof document !== 'undefined') {
                try {
                  const iframe = document.querySelector('#stackblitz-editor iframe');
                  if (iframe) {
                    console.log('[StackBlitz] Iframe dimensions:', {
                      width: iframe.offsetWidth,
                      height: iframe.offsetHeight,
                      display: window.getComputedStyle(iframe).display
                    });
                  }
                } catch (error) {
                  console.warn('[StackBlitz] Could not check iframe dimensions:', error);
                }
              }
            }, 1000);

          setVm(vmInstance);
          setIsEmbedded(true);

        }).catch((error: any) => {
          console.error('[StackBlitz] Failed to embed project:', error);
            // Reset isEmbedded to allow retry
            setIsEmbedded(false);
        });
        };

        embedProject();
        
      } catch (error) {
        console.error('[StackBlitz] Error embedding project:', error);
        setIsEmbedded(false);
      }
    }
  }, [stackblitzUrl, isEmbedded]);

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
        
        // Try to get current file state from editor first (for unsaved changes)
        console.log('[StackBlitz] VM editor object:', vm.editor);
        console.log('[StackBlitz] VM preview object:', vm.preview);
        
        // Try to get current editor content using available SDK methods
        let localCurrentFiles: any = {};
        console.log('[StackBlitz] Available editor methods:', vm.editor ? Object.getOwnPropertyNames(vm.editor) : 'No editor');

        if (vm.editor) {
          // Try different methods to get current content
          const methodsToTry = ['getCurrentFile', 'getFiles', 'getFile', 'getCurrentFiles'];

          for (const methodName of methodsToTry) {
            if (typeof vm.editor[methodName] === 'function') {
              try {
                console.log(`[StackBlitz] Trying ${methodName}...`);
                const result = await vm.editor[methodName]();
                console.log(`[StackBlitz] ${methodName} result:`, result);

                if (result && (typeof result === 'object' || typeof result === 'string')) {
                  localCurrentFiles = result;
                  console.log(`[StackBlitz] Successfully got content using ${methodName}`);
                  break;
                }
          } catch (methodError) {
            console.log(`[StackBlitz] ${methodName} failed:`, methodError instanceof Error ? methodError.message : String(methodError));
          }
            }
          }
        }

        // Store current files in state for runTests to access
        setCurrentFiles(localCurrentFiles);

        // Wait a bit for any operations to complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // Get file system snapshot as fallback
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
      // Use the current activity slug for proper scoping
      const currentPath = window.location.pathname;
      const activitySlug = currentPath.split('/').pop();

      if (!activitySlug) {
        console.error('[StackBlitz] No activity slug found in URL for saving');
        return;
      }

      // Create a properly scoped snapshot key that includes user ID and activity
      const snapshotKey = currentUser
        ? `stackblitz-snapshot-${currentUser.id}-${activitySlug}`
        : `stackblitz-snapshot-${activitySlug}`;

      const snapshot = {
        timestamp: Date.now(),
        projectId: snapshotKey,
        activitySlug: activitySlug,
        userId: currentUser?.id || null,
        saved: true,
        vmSnapshot: vmSnapshot,
        data: {
          message: "Snapshot saved at " + new Date().toLocaleString(),
          url: stackblitzUrl,
          hasVmData: vmAccessSuccess,
          note: vmAccessSuccess ? "VM snapshot captured using getFsSnapshot()" : "VM access failed"
        }
      };

      // Save to localStorage using the properly scoped key
      localStorage.setItem(snapshotKey, JSON.stringify(snapshot));
      const currentTime = Date.now();
      localStorage.setItem(`${snapshotKey}-timestamp`, currentTime.toString());
      
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
      
      // Use the current activity slug for proper scoping
      const currentPath = window.location.pathname;
      const activitySlug = currentPath.split('/').pop();

      if (!activitySlug) {
        console.log('[StackBlitz] No activity slug found in URL');
        setSaveStatus('error');
        return;
      }

      // Create a properly scoped snapshot key that includes user ID and activity
      const snapshotKey = currentUser
        ? `stackblitz-snapshot-${currentUser.id}-${activitySlug}`
        : `stackblitz-snapshot-${activitySlug}`;

      const snapshotData = localStorage.getItem(snapshotKey);
      if (!snapshotData) {
        console.log('[StackBlitz] No snapshot found for key:', snapshotKey);
        alert(`No saved progress found for this activity.\n\nTo save your progress, click "Save" first, then you can restore it later.\n\nDebug: Looking for key: ${snapshotKey}`);
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

        // Store restore timestamp with the same key format
        const currentTime = Date.now();
        localStorage.setItem(`${snapshotKey}-restore-timestamp`, currentTime.toString());
        setLastRestoreTime(new Date(currentTime));

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
      console.error('[StackBlitz] Restore failed:', error instanceof Error ? error.message : String(error));
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
        if (lastRestoreTime && lastSaveTime) {
          // Show whichever is more recent - save or restore
          const saveDiffMs = currentTime.getTime() - lastSaveTime.getTime();
          const restoreDiffMs = currentTime.getTime() - lastRestoreTime.getTime();

          if (restoreDiffMs < saveDiffMs) {
            // Restore is more recent
            const diffSeconds = Math.floor(restoreDiffMs / 1000);
            const diffMinutes = Math.floor(restoreDiffMs / (1000 * 60));
            const diffHours = Math.floor(restoreDiffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(restoreDiffMs / (1000 * 60 * 60 * 24));

            if (diffDays > 0) {
              return `Restored ${diffDays}d ago`;
            } else if (diffHours > 0) {
              return `Restored ${diffHours}h ago`;
            } else if (diffMinutes > 0) {
              return `Restored ${diffMinutes}m ago`;
            } else if (diffSeconds > 0) {
              return `Restored ${diffSeconds}s ago`;
            } else {
              return 'Restored just now';
            }
          }
        }

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

        if (lastRestoreTime) {
          const diffMs = currentTime.getTime() - lastRestoreTime.getTime();
          const diffSeconds = Math.floor(diffMs / 1000);
          const diffMinutes = Math.floor(diffMs / (1000 * 60));
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

          if (diffDays > 0) {
            return `Restored ${diffDays}d ago`;
          } else if (diffHours > 0) {
            return `Restored ${diffHours}h ago`;
          } else if (diffMinutes > 0) {
            return `Restored ${diffMinutes}m ago`;
          } else if (diffSeconds > 0) {
            return `Restored ${diffSeconds}s ago`;
          } else {
            return 'Restored just now';
          }
        }
        return 'Ready';
    }
  };

  // Don't render if no URL is available
  if (!stackblitzUrl) {
    return null;
  }

  const runTests = async () => {
    if (!testJS) {
      console.warn('[StackBlitz] No test code provided');
      return;
    }

    // Extract text content from RichText document
    const extractTextFromRichText = (richText: any): string => {
      if (typeof richText === 'string') return richText;

      if (richText && richText.content && Array.isArray(richText.content)) {
        return richText.content.map((node: any) => {
          if (node.nodeType === 'text' && node.value) {
            return node.value;
          }
          if (node.nodeType === 'paragraph' && node.content) {
            return node.content.map((subNode: any) =>
              subNode.nodeType === 'text' ? subNode.value : ''
            ).join('');
          }
          return '';
        }).join('\n');
      }

      return '';
    };

    const testCode = extractTextFromRichText(testJS);
    console.log('🧪 TEST CODE DEBUG:');
    console.log('Raw testJS object:', testJS);
    console.log('Extracted test code:', testCode);
    console.log('Test code length:', testCode.length);
    console.log('Test code preview (first 500 chars):', testCode.substring(0, 500));

    // Check if test code contains assertions
    const hasAsserts = testCode.includes('console.assert') || testCode.includes('assert');
    console.log('🧪 Test code contains assertions:', hasAsserts);

    try {
      // Wait a bit for localStorage to be updated
      await new Promise(resolve => setTimeout(resolve, 100));

      // Use the snapshot data that was just saved - this contains the current HTML content
      console.log('[StackBlitz] Testing against saved snapshot data...');

      // Get the snapshot using the current activity slug for proper scoping
      const currentPath = window.location.pathname;
      const activitySlug = currentPath.split('/').pop();

      if (!activitySlug) {
        console.error('[StackBlitz] No activity slug found in URL');
        setTestResult('❌ Error: Could not determine activity');
        return;
      }

      // Create a properly scoped snapshot key that includes user ID and activity
      const snapshotKey = currentUser
        ? `stackblitz-snapshot-${currentUser.id}-${activitySlug}`
        : `stackblitz-snapshot-${activitySlug}`;

      console.log('[StackBlitz] Looking for snapshot with key:', snapshotKey);
      console.log('[StackBlitz] Current user ID:', currentUser?.id);
      console.log('[StackBlitz] Current activity slug:', activitySlug);

      // Check all localStorage keys to debug
      const allKeys = Object.keys(localStorage);
      const snapshotKeys = allKeys.filter(key => key.startsWith('stackblitz-snapshot-'));
      console.log('[StackBlitz] All snapshot keys in localStorage:', snapshotKeys);
      console.log('[StackBlitz] Looking for key:', snapshotKey, 'exists:', localStorage.getItem(snapshotKey) !== null);

      const snapshotData = localStorage.getItem(snapshotKey);

      if (!snapshotData) {
        console.error('[StackBlitz] No snapshot data found for key:', snapshotKey);
        console.log('[StackBlitz] Available snapshot keys:', snapshotKeys);
        throw new Error('No saved progress found. Save your work first, then run tests.');
      }

      const snapshot = JSON.parse(snapshotData);
      console.log('[StackBlitz] Full snapshot object:', snapshot);
      console.log('[StackBlitz] Snapshot keys:', Object.keys(snapshot));

      // Handle different snapshot structures
      let vmSnapshot = null;
      if (snapshot.vmSnapshot) {
        vmSnapshot = snapshot.vmSnapshot;
      } else if (snapshot.files) {
        vmSnapshot = snapshot.files;
      } else {
        vmSnapshot = snapshot;
      }

      console.log('[StackBlitz] VM snapshot keys:', Object.keys(vmSnapshot));
      console.log('[StackBlitz] VM snapshot content preview:', {
        script_js: vmSnapshot['script.js']?.substring(0, 50),
        index_html: vmSnapshot['index.html']?.substring(0, 50)
      });

      // Start with file system snapshot content
      let htmlContent = vmSnapshot['index.html'];
      let scriptContent = vmSnapshot['script.js'];
      let cssContent = vmSnapshot['styles.css'];

      // Override with current editor content if available (for unsaved changes)
      if (currentFiles && Object.keys(currentFiles).length > 0) {
        console.log('[StackBlitz] Current files object:', currentFiles);

        // Handle different possible formats of currentFiles
        if (typeof currentFiles === 'object' && currentFiles !== null) {
          // Object format: { 'index.html': content, 'script.js': content, ... }
          console.log('[StackBlitz] Using current editor content (object format)');
          if (currentFiles['index.html']) {
            htmlContent = currentFiles['index.html'];
            console.log('[StackBlitz] Using current index.html from editor');
          }
          if (currentFiles['script.js']) {
            scriptContent = currentFiles['script.js'];
            console.log('[StackBlitz] Using current script.js from editor');
          }
          if (currentFiles['styles.css']) {
            cssContent = currentFiles['styles.css'];
            console.log('[StackBlitz] Using current styles.css from editor');
          }
        } else if (typeof currentFiles === 'string') {
          // String format - might be current file content
          console.log('[StackBlitz] Current files is a string, using as current content');
          // Try to determine which file this is based on context or use as fallback
          if (currentFiles.includes('<html') || currentFiles.includes('<title')) {
            htmlContent = currentFiles;
            console.log('[StackBlitz] Using string as HTML content');
          } else if (currentFiles.includes('console.log') || currentFiles.includes('function')) {
            scriptContent = currentFiles;
            console.log('[StackBlitz] Using string as script content');
          } else {
            cssContent = currentFiles;
            console.log('[StackBlitz] Using string as CSS content');
          }
        }
      }

      console.log('[StackBlitz] Raw HTML content:', htmlContent);
      console.log('[StackBlitz] Raw script content:', scriptContent);
      console.log('[StackBlitz] Raw CSS content:', cssContent);

      // Ensure we have valid strings
      htmlContent = htmlContent || '';
      scriptContent = scriptContent || '';
      cssContent = cssContent || '';

      console.log('[StackBlitz] HTML content length:', htmlContent.length);
      console.log('[StackBlitz] Script content length:', scriptContent.length);
      console.log('[StackBlitz] CSS content length:', cssContent.length);

      if (!htmlContent) {
        throw new Error('No index.html found in VM or snapshot');
      }

      // Check if script.js is empty or only contains whitespace/comments
      const trimmedScript = scriptContent.trim();
      const scriptWithoutComments = trimmedScript.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '').trim();
      
      if (!scriptWithoutComments || scriptWithoutComments.length === 0) {
        throw new Error('Your script.js file is empty. Please write some code before running tests.');
      }
      
      console.log('[StackBlitz] Script content validation passed - user has written code');

      console.log('[StackBlitz] Testing HTML content:', htmlContent.substring(0, 200) + '...');

      // Debug: Check what content we're actually testing
      console.log('[StackBlitz] Final HTML content preview:', htmlContent.substring(0, 200));
      console.log('[StackBlitz] Final script content preview:', scriptContent?.substring(0, 100));

      // Create a mock DOM environment for the test
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

              // Execute test code in the context of the parsed document
              try {
                // Track test results
                let testsPassed = true;
                let testErrors: string[] = [];

                console.log('🧪 TEST EXECUTION DEBUG:');
                console.log('Test code to execute:', testCode.substring(0, 200) + '...');
                console.log('HTML content length:', htmlContent?.length || 0);
                console.log('Script content length:', scriptContent?.length || 0);
                console.log('CSS content length:', cssContent?.length || 0);

                // Execute test code with proper Node.js environment
                // The test code from Contentful contains actual unit tests
                let testResult = null;

                try {
                  console.log('🧪 Executing Contentful unit tests...');

                  // Capture the real console to avoid circular references
                  const realConsole = {
                    log: console.log.bind(console),
                    error: console.error.bind(console),
                    warn: console.warn.bind(console),
                    info: console.info.bind(console)
                  };

                  // Track assertion count to ensure tests actually ran
                  let assertionCount = 0;
                  let assertionFailures: string[] = [];

                  // Simple globals for test execution
                  const simpleGlobals = {
                    require: (moduleName: string) => {
                      console.log(`🧪 require() called for: ${moduleName}`);
                      if (moduleName === 'fs') {
                        return {
                          readFileSync: (path: string) => {
                            if (path === 'index.html' || path === './index.html') return htmlContent || '<html><body></body></html>';
                            if (path === 'script.js' || path === './script.js') return scriptContent || '';
                            if (path === 'style.css' || path === './style.css' || path === 'styles.css' || path === './styles.css') return cssContent || '';
                            throw new Error(`File '${path}' not found`);
                          },
                          existsSync: (path: string) => ['index.html', 'script.js', 'style.css', 'styles.css'].includes(path) ||
                                                       ['./index.html', './script.js', './style.css', './styles.css'].includes(path)
                        };
                      }
                      if (moduleName === 'jsdom') {
                        return {
                          JSDOM: class {
                            constructor(html: string) {
                              return {
                                window: {
                                  document: {
                                    querySelector: (selector: string) => {
                                      if (selector === 'title') {
                                        const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
                                        return match ? { textContent: match[1] } : null;
                                      }
                                      if (selector === 'h1') {
                                        const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
                                        return match ? { textContent: match[1] } : null;
                                      }
                                      if (selector === 'img') {
                                        const match = html.match(/<img([^>]*)>/i);
                                        if (match) {
                                          const altMatch = match[1].match(/alt=["']([^"']*)["']/i);
                                          return { alt: altMatch ? altMatch[1] : '' };
                                        }
                                        return null;
                                      }
                                      return null;
                                    }
                                  }
                                }
                              };
                            }
                          }
                        };
                      }
                      throw new Error(`Module '${moduleName}' not found`);
                    },
                    console: {
                      assert: (condition: boolean, ...args: any[]) => {
                        assertionCount++;
                        realConsole.log(`🧪 Assertion #${assertionCount}: ${condition ? 'PASS' : 'FAIL'}`);
                        if (!condition) {
                          const message = args.length > 0 ? args.join(' ') : 'Assertion failed';
                          assertionFailures.push(message);
                          realConsole.error('🧪 Assertion failed:', message);
                          throw new Error(`Assertion failed: ${message}`);
                        }
                      },
                      log: (...args: any[]) => {
                        realConsole.log('🧪 [Test]', ...args);
                      },
                      error: (...args: any[]) => {
                        realConsole.error('🧪 [Test Error]', ...args);
                      },
                      warn: (...args: any[]) => {
                        realConsole.warn('🧪 [Test Warning]', ...args);
                      },
                      info: (...args: any[]) => {
                        realConsole.info('🧪 [Test Info]', ...args);
                      }
                    }
                  };


                  // Execute the test code with simple globals
                  const testFunction = new Function(`
                    "use strict";
                    // Set up simple globals for test execution
                    globalThis.require = arguments[0].require;
                    globalThis.console = arguments[0].console;

                  ${testCode}
                    // Return the actual result from the test code
                    return typeof testResult !== 'undefined' ? testResult : undefined;
                  `);

                  testResult = testFunction(simpleGlobals);
                  console.log('🧪 Raw test result:', testResult, 'type:', typeof testResult);
                  console.log('🧪 Total assertions checked:', assertionCount);
                  console.log('🧪 Assertion failures:', assertionFailures.length);

                  // CRITICAL: Check if any assertions were actually executed
                  if (assertionCount === 0) {
                    testsPassed = false;
                    testErrors.push('No assertions were executed. The test code may not be running correctly.');
                    console.error('🧪 CRITICAL: No assertions were executed!');
                    console.log('🧪 This means the test code ran but did not check anything.');
                    console.log('🧪 Test code preview:', testCode.substring(0, 500));
                  } else if (assertionFailures.length > 0) {
                    // At least one assertion failed
                    testsPassed = false;
                    console.log('🧪 Tests FAILED: Some assertions failed');
                  } else {
                    // Check the return value from test execution
                    if (testResult === true || testResult === 'passed' || testResult === 'success') {
                      testsPassed = true;
                      console.log('🧪 Tests PASSED:', testResult);
                    } else if (testResult === false || testResult === 'failed' || testResult === 'error') {
                      testsPassed = false;
                      testErrors.push('Tests returned false/failed/error');
                      console.log('🧪 Tests FAILED:', testResult);
                    } else if (testResult === undefined || testResult === null) {
                      // Test code completed without errors and assertions passed
                      testsPassed = true;
                      console.log(`🧪 Tests PASSED: All ${assertionCount} assertion(s) passed`);
                    } else {
                      // Unexpected result
                      testsPassed = false;
                      testErrors.push(`Unexpected test result: ${testResult}`);
                      console.log('🧪 Tests returned unexpected result:', testResult);
                    }
                  }

                } catch (error) {
                  console.log('🧪 Test execution caught error:', error);
                  console.log('🧪 Error type:', typeof error);
                  const errorMessage = error instanceof Error ? error.message : String(error);
                  console.log('🧪 Error message:', errorMessage);
                  console.log('🧪 Error stack:', error instanceof Error ? error.stack : 'No stack');
                  testsPassed = false;

                  // Check if this is an assertion failure with a specific message
                  if (errorMessage && errorMessage.includes('Assertion failed')) {
                    testErrors.push(errorMessage);
                  } else {
                    testErrors.push(errorMessage || 'Test execution failed');
                  }
                }

                const resultMessage = testsPassed ? 'All tests passed!' : `Tests failed: ${testErrors.join(', ')}`;
                setTestResult(resultMessage);

                // Mark challenge as completed if all tests pass
                console.log('🧪 Completion check:', {
                  isChallenge,
                  testsPassed,
                  hasCurrentUser: !!currentUser,
                  testErrors: testErrors.length
                });

                if (isChallenge && testsPassed && currentUser) {
                  const challengeSlug = window.location.pathname.split('/').pop();
                  const completedKey = `challenge-completed-${currentUser.id}-${challengeSlug}`;

                  console.log('[StackBlitz] Marking challenge as completed:', challengeSlug);
                  console.log('[StackBlitz] User ID:', currentUser.id);
                  console.log('[StackBlitz] Completed key:', completedKey);

                  // Save to localStorage first
                  localStorage.setItem(completedKey, 'true');
                  console.log('[StackBlitz] Saved to localStorage');

                  // Update React state
                  setIsCompleted(true);
                  console.log('[StackBlitz] Updated React state');

                  // Dispatch event for other components
                  if (typeof window !== 'undefined') {
                    const eventDetail = { slug: challengeSlug };
                    console.log('[StackBlitz] Dispatching item-completed event:', eventDetail);
                    window.dispatchEvent(new CustomEvent('item-completed', { detail: eventDetail }));
                  }
                          
                  // Force a re-check after a short delay to ensure localStorage is updated
                          setTimeout(() => {
                    checkChallengeCompletion();
                  }, 100);

                  // Reload the page to ensure all components update (fallback)
                  setTimeout(() => {
                    console.log('[StackBlitz] Reloading page to update completion status');
                            window.location.reload();
                  }, 500);

                  // Database persistence disabled for now - using localStorage only
                  console.log('[StackBlitz] Challenge completion saved to localStorage only');
                }
              } catch (testError) {
                const err = testError as Error;
                setTestResult(`❌ Test failed: ${err.message}`);
              }

    } catch (error) {
      const err = error as Error;
      console.error('[StackBlitz] Test execution failed:', err);
      setTestResult(`❌ Test execution failed: ${err.message}`);
      console.log('Test code for manual execution:', testCode);
    }
  };

  const runScript = async () => {
    console.log('[StackBlitz] Run button clicked');

    // Reset terminal state for fresh execution
    setTerminalOpen(false);

    // Check if script.js exists in the current project
    const scriptExists = await checkScriptExists();

    if (!scriptExists) {
      setTestResult('❌ No script.js file found in project');
      console.log('[StackBlitz] No script.js file detected in project');
      return;
    }

    try {
      console.log('[StackBlitz] Opening terminal popup...');

      // Get current script content from VM (most current)
      let currentScriptContent = '';

      if (vm) {
        console.log('[StackBlitz] VM available, trying to get current script content');

        try {
          // Try to get current files from VM editor
          if (vm.editor && typeof vm.editor.getFiles === 'function') {
            const currentFiles = await vm.editor.getFiles();
            console.log('[StackBlitz] Current VM files:', Object.keys(currentFiles));

            if (currentFiles['script.js']) {
              console.log('[StackBlitz] Found script.js in current VM files');
              currentScriptContent = currentFiles['script.js'];
            }
          }

          // If not found in editor, try direct filesystem access
          if (!currentScriptContent && vm.fs && typeof vm.fs.readFile === 'function') {
            try {
              currentScriptContent = await vm.fs.readFile('script.js', 'utf-8');
              console.log('[StackBlitz] Read script.js directly from VM filesystem');
            } catch (fsError) {
              console.warn('[StackBlitz] Could not read script.js from VM filesystem:', fsError);
            }
          }
        } catch (vmError) {
          console.warn('[StackBlitz] Error accessing VM for script content:', vmError);
        }
      }

      // Fallback to localStorage snapshot if VM doesn't have current content
      if (!currentScriptContent && typeof window !== 'undefined' && projectId) {
        const snapshot = localStorage.getItem(`stackblitz-snapshot-${projectId}`);
        if (snapshot) {
          try {
            const snapshotData = JSON.parse(snapshot);
            console.log('[StackBlitz] Checking snapshot for script.js');

            // Look for script.js in snapshot
            if (snapshotData['script.js']) {
              currentScriptContent = snapshotData['script.js'];
              console.log('[StackBlitz] Found script.js in snapshot');
            } else if (snapshotData.files && snapshotData.files['script.js']) {
              currentScriptContent = snapshotData.files['script.js'];
              console.log('[StackBlitz] Found script.js in snapshot.files');
            }
          } catch (parseError) {
            console.error('[StackBlitz] Failed to parse snapshot for script content:', parseError);
          }
        }
      }

      // Set the script content (use existing content if no new content found)
      if (currentScriptContent) {
        setScriptContent(currentScriptContent);
                        } else {
        console.log('[StackBlitz] No script content found, using existing content');
        currentScriptContent = scriptContent; // Use existing content
      }

      console.log('[StackBlitz] Script content length:', currentScriptContent.length);
      setTerminalOpen(true);

      // Method 1: Try to get from VM if available
      if (vm) {
        console.log('[StackBlitz] VM available, trying to get script content');

        // Try multiple ways to get script content from VM
        try {
          // Method 1a: Try vm.editor.getFiles()
          if (vm.editor && typeof vm.editor.getFiles === 'function') {
            const currentFiles = await vm.editor.getFiles();
            console.log('[StackBlitz] Current VM files:', Object.keys(currentFiles));

            if (currentFiles['script.js']) {
              console.log('[StackBlitz] Found script.js in VM files');
              setScriptContent(currentFiles['script.js']);
              setTerminalOpen(true);
              return;
            }
          }

          // Method 1b: Try vm.getFsSnapshot() directly
          if (typeof vm.getFsSnapshot === 'function') {
            const vmSnapshot = await vm.getFsSnapshot();
            console.log('[StackBlitz] Direct VM snapshot:', Object.keys(vmSnapshot));

            if (vmSnapshot['script.js']) {
              console.log('[StackBlitz] Found script.js in direct VM snapshot');
              setScriptContent(vmSnapshot['script.js']);
              setTerminalOpen(true);
              return;
            }
          }

          // Method 1c: Try to read script.js file directly from VM filesystem
          if (vm.fs && typeof vm.fs.readFile === 'function') {
            try {
              const scriptContent = await vm.fs.readFile('script.js', 'utf-8');
              console.log('[StackBlitz] Read script.js directly from VM filesystem');
              setScriptContent(scriptContent);
              setTerminalOpen(true);
              return;
            } catch (fsError) {
              console.warn('[StackBlitz] Could not read script.js from VM filesystem:', fsError);
            }
          }
        } catch (vmError) {
          console.warn('[StackBlitz] Error accessing VM for script content:', vmError);
        }
      }

      // Method 2: Try from localStorage snapshot
      if (typeof window !== 'undefined' && projectId) {
        const snapshot = localStorage.getItem(`stackblitz-snapshot-${projectId}`);
        if (snapshot) {
          try {
            const snapshotData = JSON.parse(snapshot);
            console.log('[StackBlitz] Full snapshot data:', snapshotData);
            console.log('[StackBlitz] Snapshot type:', typeof snapshotData);
            console.log('[StackBlitz] Snapshot keys:', Object.keys(snapshotData));

            // Look for script.js with different possible structures
            let scriptContent = null;

            // Check direct access
            if (snapshotData['script.js']) {
              scriptContent = snapshotData['script.js'];
              console.log('[StackBlitz] Found script.js directly in snapshot');
            }
            // Check nested files structure
            else if (snapshotData.files && snapshotData.files['script.js']) {
              scriptContent = snapshotData.files['script.js'];
              console.log('[StackBlitz] Found script.js in snapshot.files');
            }
            // Check if snapshotData itself is the files object
            else if (typeof snapshotData === 'object' && snapshotData !== null) {
              // Look for script.js in any nested object
              const findScript = (obj: any): string | null => {
                if (obj && typeof obj === 'object') {
                  if (obj['script.js']) return obj['script.js'];
                  for (const key in obj) {
                    if (typeof obj[key] === 'object') {
                      const found = findScript(obj[key]);
                      if (found) return found;
                    }
                  }
                }
                return null;
              };
              scriptContent = findScript(snapshotData);
              if (scriptContent) {
                console.log('[StackBlitz] Found script.js through deep search');
              }
            }

            if (scriptContent && scriptContent !== '// No script content found') {
              console.log('[StackBlitz] Successfully loaded script content');
              setScriptContent(scriptContent);
              setTerminalOpen(true);
            } else {
              console.log('[StackBlitz] Script content not found or empty');
              setScriptContent('// Script file exists but content not found in snapshot');
              setTerminalOpen(true);
            }
          } catch (parseError) {
            console.error('[StackBlitz] Failed to parse snapshot for script content:', parseError);
            setTestResult('❌ Error loading script content');
            setScriptContent('// Error loading script content');
            setTerminalOpen(true);
          }
        } else {
          console.log('[StackBlitz] No snapshot found in localStorage');
          setScriptContent('// No project snapshot available - script may not be saved yet');
          setTerminalOpen(true);
        }
      } else {
        console.log('[StackBlitz] No project data available');
        // Try to get script content from any available source
        const fallbackScript = `// Default script content
console.log('Hello from StackBlitz!');
console.log('Your script.js file should be here.');
console.log('Make sure to save your work first.');`;
        setScriptContent(fallbackScript);
        setTerminalOpen(true);
      }
    } catch (err: any) {
      setTestResult(`❌ Failed to open terminal: ${err.message}`);
      console.error('[StackBlitz] Terminal open error:', err);
    }
  };

  const saveAndTest = async () => {
    setTestResult(null); // Clear previous test result
    await saveSnapshot();
    runTests();
  };

  return (
    <>
    <div className={`fixed bottom-0 left-0 right-0 z-50 ${className}`}>
      {/* Toggle Button */}
      <div className="flex justify-end mb-2 mr-4">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-t-lg"
        >
          <Code className="h-4 w-4" />
          Work on Code
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>

      {/* Editor Panel */}
      <div className={`bg-white border-t border-gray-200 shadow-lg transition-all duration-300 ${isOpen ? 'block' : 'hidden'}`}>
        <div className="h-[50vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                <span className="font-medium">Code Editor</span>

                {/* Completion indicator */}
                {isCompleted && completionType && (
                  <div className="flex items-center gap-1 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    <CheckCircleIcon className="h-3 w-3" />
                    {completionType === 'challenge' ? 'Challenge Complete' : 'Quiz Perfect'}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Status */}
                <div className="flex items-center gap-1 text-sm">
                  {getStatusIcon()}
                  <span>{getStatusText()}</span>
                </div>
                
                {/* Save/Restore Buttons */}
                <div className="flex gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={currentUser ? saveAndTest : () => window.location.href = '/auth/login'}
                      disabled={saveStatus === 'saving' || !currentUser}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1"
                      title={currentUser ? (isChallenge ? 'Save and Check' : 'Save') : 'Sign in to save your work'}
                    >
                      <Save className="h-3 w-3" />
                      {currentUser ? (isChallenge ? 'Save and Check' : 'Save') : 'Sign In to Save'}
                    </Button>

                    <Button
                      onClick={currentUser ? runScript : () => window.location.href = '/auth/login'}
                      disabled={saveStatus === 'saving' || !currentUser}
                      size="sm"
                      variant="outline"
                      className={`flex items-center gap-1 ${hasScriptFile ? 'text-green-600 border-green-300 hover:bg-green-50' : 'opacity-50'}`}
                      title={currentUser ? (hasScriptFile ? 'Open terminal with script.js content' : 'No script.js file found') : 'Sign in to run your code'}
                    >
                      <Terminal className="h-3 w-3" />
                      {currentUser ? (hasScriptFile ? 'Run' : 'No Script') : 'Sign In to Run'}
                    </Button>

                    {/* Test result display */}
                    {testResult && (
                      <div className={`text-sm px-2 py-1 rounded ${testResult.includes('failed') || testResult.includes('❌') || testResult.includes('error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {testResult}
                      </div>
                    )}
                  </div>
                  
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
                      console.log('[StackBlitz] Manual refresh triggered');

                      // Try to refresh the StackBlitz editor
                      if (vm && vm.editor) {
                        console.log('[StackBlitz] Refreshing editor...');
                        if (typeof vm.editor.refresh === 'function') {
                          vm.editor.refresh();
                        }
                        if (typeof vm.editor.focus === 'function') {
                          vm.editor.focus();
                        }
                      } else {
                        console.warn('[StackBlitz] VM instance not available for refresh');
                        // Try to force re-embed
                        setIsEmbedded(false);
                      }
                    }}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1"
                    title="Refresh StackBlitz editor if content isn't loading"
                  >
                    <AlertCircle className="h-3 w-3" />
                    Refresh
                  </Button>
                  
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
                ref={editorRef}
                id="stackblitz-editor" 
                className="w-full h-full"
                style={{
                  minHeight: '400px',
                  backgroundColor: '#1e1e1e',
                  border: '1px solid #333'
                }}
              />
              {stackblitzUrl && !isEmbedded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-600">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm">Loading StackBlitz Editor...</p>
            </div>
          </div>
              )}
        </div>
    </div>
        </div>
      </div>

      {/* Terminal Popup */}
      <TerminalPopup
        key={terminalKey}
        isOpen={terminalOpen}
        onClose={() => setTerminalOpen(false)}
        scriptContent={scriptContent}
        projectId={projectId}
      />
    </>
  );
}