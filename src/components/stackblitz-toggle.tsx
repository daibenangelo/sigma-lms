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
  CheckCircle as CheckCircleIcon
} from "lucide-react";
import StackBlitzSDK from '@stackblitz/sdk';
import { supabase } from '@/lib/supabase';

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
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isChallenge, setIsChallenge] = useState(false);
  const [isQuiz, setIsQuiz] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionType, setCompletionType] = useState<'quiz' | 'challenge' | null>(null);

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
  const checkChallengeCompletion = () => {
    if (typeof window !== 'undefined' && currentUser) {
      const challengeSlug = window.location.pathname.split('/').pop();
      const completedKey = `challenge-completed-${currentUser.id}-${challengeSlug}`;
      const isCompleted = localStorage.getItem(completedKey) === 'true';
      setIsCompleted(isCompleted);
    }
  };

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

  // Embed StackBlitz project when URL is available (only once)
  useEffect(() => {
    if (stackblitzUrl && !isEmbedded) {
      console.log('[StackBlitz] Embedding project with URL:', stackblitzUrl);
      
      try {
        // Extract project ID from URL - just the project name for embedding
        const url = new URL(stackblitzUrl);
        const projectId = url.pathname.split('/').pop() || 'default';
        
        console.log('[StackBlitz] Project ID:', projectId);
        
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
          setVm(vmInstance);
          setIsEmbedded(true);
        }).catch((error: any) => {
          console.error('[StackBlitz] Failed to embed project:', error);
        });
        
      } catch (error) {
        console.error('[StackBlitz] Error embedding project:', error);
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
      // Use the correct projectId format for saving (with ?file=index.html)
      const url = new URL(stackblitzUrl);
      const pathnameParts = url.pathname.split('/');
      const projectName = pathnameParts[pathnameParts.length - 1];
      const snapshotProjectId = `${projectName}?file=index.html`;

      const snapshot = {
        timestamp: Date.now(),
        projectId: snapshotProjectId,
        saved: true,
        vmSnapshot: vmSnapshot,
        data: {
          message: "Snapshot saved at " + new Date().toLocaleString(),
          url: stackblitzUrl,
          hasVmData: vmAccessSuccess,
          note: vmAccessSuccess ? "VM snapshot captured using getFsSnapshot()" : "VM access failed"
        }
      };

      // Save to localStorage using the same key format
      localStorage.setItem(`stackblitz-snapshot-${snapshotProjectId}`, JSON.stringify(snapshot));
      const currentTime = Date.now();
      localStorage.setItem(`stackblitz-snapshot-${snapshotProjectId}-timestamp`, currentTime.toString());
      
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
      
      // Use the same projectId format as when saving
      const url = new URL(stackblitzUrl);
      const pathnameParts = url.pathname.split('/');
      const projectName = pathnameParts[pathnameParts.length - 1]; // Just the project name
      const snapshotProjectId = `${projectName}?file=index.html`;

      const snapshotData = localStorage.getItem(`stackblitz-snapshot-${snapshotProjectId}`);
      if (!snapshotData) {
        console.log('[StackBlitz] No snapshot found for projectId:', snapshotProjectId);
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
    console.log('Test code preview (first 200 chars):', testCode.substring(0, 200));

    try {
      // Wait a bit for localStorage to be updated
      await new Promise(resolve => setTimeout(resolve, 100));

      // Use the snapshot data that was just saved - this contains the current HTML content
      console.log('[StackBlitz] Testing against saved snapshot data...');

      // Get the most recent snapshot from localStorage
      // Extract just the project name (without query params) and add file param
      const url = new URL(stackblitzUrl);
      const pathnameParts = url.pathname.split('/');
      const projectName = pathnameParts[pathnameParts.length - 1]; // Just the project name
      const projectId = `${projectName}?file=index.html`;
      const snapshotKey = `stackblitz-snapshot-${projectId}`;

      console.log('[StackBlitz] Looking for snapshot with key:', snapshotKey);
      console.log('[StackBlitz] Current stackblitzUrl:', stackblitzUrl);
      console.log('[StackBlitz] Extracted projectId:', projectId);

      // Check all localStorage keys to debug
      const allKeys = Object.keys(localStorage);
      const snapshotKeys = allKeys.filter(key => key.startsWith('stackblitz-snapshot-'));
      console.log('[StackBlitz] All snapshot keys in localStorage:', snapshotKeys);

      const snapshotData = localStorage.getItem(snapshotKey);

      if (!snapshotData) {
        console.error('[StackBlitz] No snapshot data found for key:', snapshotKey);
        console.log('[StackBlitz] Available snapshot keys:', snapshotKeys);
        throw new Error('No snapshot data found - please save first');
      }

      const snapshot = JSON.parse(snapshotData);
      console.log('[StackBlitz] Found snapshot:', Object.keys(snapshot.vmSnapshot));

      // Get the HTML content from the snapshot
      const htmlContent = snapshot.vmSnapshot['index.html'];
      if (!htmlContent) {
        throw new Error('No index.html found in snapshot');
      }

      console.log('[StackBlitz] Testing HTML content:', htmlContent.substring(0, 200) + '...');

      // Create a mock DOM environment for the test
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

              // Execute test code in the context of the parsed document
              try {
                const testFunction = new Function('document', `
                  ${testCode}
                  return 'All tests passed!';
                `);
                const result = testFunction(doc);
                setTestResult(result);

                // Mark challenge as completed if all tests pass
                if (isChallenge && result.includes('All tests passed')) {
                  const challengeSlug = window.location.pathname.split('/').pop();
                  const completedKey = `challenge-completed-${currentUser!.id}-${challengeSlug}`;
                  localStorage.setItem(completedKey, 'true');
                  setIsCompleted(true);

                  // Persist to database per user and course
                  try {
                    const courseSlug = new URLSearchParams(window.location.search).get('course');
                    if (courseSlug && challengeSlug) {
                      const { data: userData } = await supabase.auth.getUser();
                      const currentUser = userData?.user;
                      if (currentUser) {
                        const lessonsRes = await fetch(`/api/lessons?course=${encodeURIComponent(courseSlug)}`);
                        const lessonsData = lessonsRes.ok ? await lessonsRes.json() : null;
                        const totalItems = Array.isArray(lessonsData?.allContent) ? lessonsData.allContent.length : 0;

                        const { data: existingProgress } = await supabase
                          .from('user_progress')
                          .select('*')
                          .eq('user_id', currentUser.id)
                          .eq('course_slug', courseSlug)
                          .maybeSingle();

                        const existingCompleted: string[] = Array.isArray(existingProgress?.completed_items) ? existingProgress!.completed_items : [];
                        const updatedCompleted = existingCompleted.includes(challengeSlug) ? existingCompleted : [...existingCompleted, challengeSlug];
                        const progressPercentage = totalItems > 0 ? Math.round((updatedCompleted.length / totalItems) * 100) : 0;

                        // Prepare upsert data with fallback for missing viewed_items column
                        const upsertData: any = {
                          user_id: currentUser.id,
                          course_slug: courseSlug,
                          completed_items: updatedCompleted,
                          progress_percentage: progressPercentage,
                          last_updated: new Date().toISOString()
                        };

                        // Only include viewed_items if the column exists (from existing progress)
                        if (existingProgress && 'viewed_items' in existingProgress) {
                          upsertData.viewed_items = existingProgress.viewed_items || [];
                        }

                        let upsertErr = null;
                        
                        // Try upsert first
                        const { error: upsertError } = await supabase
                          .from('user_progress')
                          .upsert(upsertData, {
                            onConflict: 'user_id,course_slug'
                          });
                        
                        upsertErr = upsertError;
                        
                        // If upsert fails, try insert
                        if (upsertErr) {
                          console.warn('[StackBlitz] Upsert failed, trying insert:', upsertErr);
                          const { error: insertError } = await supabase
                            .from('user_progress')
                            .insert(upsertData);
                          
                          upsertErr = insertError;
                        }

                        if (upsertErr) {
                          console.warn('[StackBlitz] Database save failed, using localStorage fallback:', upsertErr);
                          
                          // Fallback: Save to localStorage
                          if (typeof window !== 'undefined') {
                            const storageKey = `courseProgress_${currentUser.id}_${courseSlug}`;
                            const existingStorage = localStorage.getItem(storageKey);
                            const storageData = existingStorage ? JSON.parse(existingStorage) : { completed_items: [] };
                            
                            if (!storageData.completed_items.includes(challengeSlug)) {
                              storageData.completed_items.push(challengeSlug);
                              storageData.progress_percentage = progressPercentage;
                              storageData.last_updated = new Date().toISOString();
                              localStorage.setItem(storageKey, JSON.stringify(storageData));
                              console.log('[StackBlitz] Saved challenge completion to localStorage as fallback');
                            }
                          }
                        } else {
                          console.log('[StackBlitz] Course progress updated for challenge completion');
                        }
                        
                        // Dispatch event and reload regardless of database success
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(new CustomEvent('item-completed', { detail: { slug: challengeSlug } }));
                          console.log('[StackBlitz] Challenge completed, dispatching item-completed event');
                          
                          // Reload the page to show updated completion status
                          setTimeout(() => {
                            window.location.reload();
                          }, 1000); // Small delay to ensure event is processed
                        }
                      }
                    }
                  } catch (dbErr) {
                    console.error('[StackBlitz] Error persisting challenge completion:', dbErr);
                  }
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

  const saveAndTest = async () => {
    setTestResult(null); // Clear previous test result
    await saveSnapshot();
    runTests();
  };

  return (
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
                      onClick={saveAndTest} // Use saveAndTest instead of saveSnapshot
                      disabled={saveStatus === 'saving'}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <Save className="h-3 w-3" />
                      {isChallenge ? 'Save and Check' : 'Save'}
                    </Button>

                    {/* Test result display */}
                    {testResult && (
                      <div className={`text-sm px-2 py-1 rounded ${testResult.includes('❌') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
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
                style={{ minHeight: '300px' }}
              />
            </div>
          </div>
        </div>
    </div>
  );
}