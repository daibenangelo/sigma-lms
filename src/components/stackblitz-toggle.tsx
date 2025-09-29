"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import type { Document } from "@contentful/rich-text-types";
import { INLINES } from "@contentful/rich-text-types";
import { Button } from "@/components/ui/button";
import { X, Code, ExternalLink, Clock, AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";

interface StackBlitzToggleProps {
  document: Document;
  course?: string;
  className?: string;
}

// Utility function to extract StackBlitz URLs from a rich text document
function extractStackBlitzUrls(document: Document, course?: string): string[] {
  const urls: string[] = [];
  
  const walkNodes = (node: any) => {
    if (!node) return;
    
    // Check for hyperlinks
    if (node.nodeType === INLINES.HYPERLINK) {
      const url = node.data?.uri;
      if (url && (url.includes('stackblitz.com') || url.includes('stackblitz.io'))) {
        // Filter by course if provided
        if (course) {
          const urlLower = url.toLowerCase();
          const courseLower = course.toLowerCase();
          
          // Check if the URL or surrounding context matches the course
          if (urlLower.includes(courseLower) || 
              urlLower.includes(courseLower.replace('-', ' ')) ||
              urlLower.includes(courseLower.replace(' ', '-'))) {
            urls.push(url);
          }
        } else {
          urls.push(url);
        }
      }
    }
    
    // Check for text nodes that might contain URLs
    if (node.nodeType === 'text' && node.value) {
      const stackblitzRegex = /https?:\/\/(?:www\.)?(?:stackblitz\.com|stackblitz\.io)\/[^\s)]+/g;
      const matches = node.value.match(stackblitzRegex);
      if (matches) {
        matches.forEach((match: string) => {
          // Filter by course if provided
          if (course) {
            const urlLower = match.toLowerCase();
            const courseLower = course.toLowerCase();
            
            if (urlLower.includes(courseLower) || 
                urlLower.includes(courseLower.replace('-', ' ')) ||
                urlLower.includes(courseLower.replace(' ', '-'))) {
              urls.push(match);
            }
          } else {
            urls.push(match);
          }
        });
      }
    }
    
    // Recursively check child nodes
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(walkNodes);
    }
  };
  
  walkNodes(document);
  return [...new Set(urls)]; // Remove duplicates
}

// Generate a unique project ID based on the original URL and course
function generateProjectId(originalUrl: string, course?: string): string {
  const urlHash = btoa(originalUrl).replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
  const courseHash = course ? btoa(course).replace(/[^a-zA-Z0-9]/g, '').substring(0, 4) : '';
  return `challenge-${courseHash}-${urlHash}`;
}

// Convert StackBlitz project URL to embed URL
function getStackBlitzEmbedUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Handle different StackBlitz URL formats
    if (urlObj.hostname.includes('stackblitz.com') || urlObj.hostname.includes('stackblitz.io')) {
      // Convert regular StackBlitz URLs to embed format
      const embedUrl = new URL(url);
      embedUrl.searchParams.set('embed', '1');
      // Don't set a specific file - let StackBlitz use its default
      embedUrl.searchParams.set('hideNavigation', '1');
      embedUrl.searchParams.set('hideDevTools', '0');
      embedUrl.searchParams.set('view', 'both'); // Show both editor and preview
      
      // Remove any existing file parameter that might be causing issues
      embedUrl.searchParams.delete('file');
      
      console.log('[StackBlitz] Generated embed URL:', embedUrl.toString());
      return embedUrl.toString();
    }
    
    return url;
  } catch (e) {
    console.warn('Failed to parse StackBlitz URL:', url, e);
    return url;
  }
}

// Create a script to inject into StackBlitz iframe for save detection
function createStackBlitzSaveDetector(projectId: string): string {
  return `
    (function() {
      console.log('[StackBlitz Save Detector] Initializing for project ${projectId}');
      
      // Function to send save event to parent
      function notifySave() {
        console.log('[StackBlitz Save Detector] Save detected, notifying parent...');
        window.parent.postMessage({
          type: 'stackblitz-save',
          projectId: '${projectId}',
          timestamp: new Date().toISOString()
        }, '*');
      }
      
      // Function to send file change event to parent
      function notifyFileChange() {
        console.log('[StackBlitz Save Detector] File change detected, notifying parent...');
        window.parent.postMessage({
          type: 'stackblitz-fs-change',
          projectId: '${projectId}',
          timestamp: new Date().toISOString()
        }, '*');
      }
      
      // Try to hook into StackBlitz save events
      function setupSaveDetection() {
        // Method 1: Listen for save button clicks
        const saveButtons = document.querySelectorAll('[data-testid="save-button"], .save-button, button[title*="Save"], button[aria-label*="Save"]');
        saveButtons.forEach(button => {
          button.addEventListener('click', notifySave);
        });
        
        // Method 2: Listen for keyboard shortcuts (Ctrl+S, Cmd+S)
        document.addEventListener('keydown', (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            setTimeout(notifySave, 100); // Small delay to let StackBlitz process the save
          }
        });
        
        // Method 3: Listen for file system changes
        if (window.stackblitz && window.stackblitz.vm) {
          const vm = window.stackblitz.vm;
          if (typeof vm.onFsChange === 'function') {
            vm.onFsChange(() => {
              console.log('[StackBlitz Save Detector] VM file system changed');
              notifyFileChange();
            });
          }
        }
        
        // Method 4: Poll for save events (fallback)
        let lastSaveTime = 0;
        setInterval(() => {
          // Check if there are any recent save indicators
          const saveIndicators = document.querySelectorAll('[data-testid="saved-indicator"], .saved-indicator, [title*="saved"]');
          saveIndicators.forEach(indicator => {
            const text = indicator.textContent || indicator.getAttribute('title') || '';
            if (text.includes('saved') && Date.now() - lastSaveTime > 1000) {
              lastSaveTime = Date.now();
              notifySave();
            }
          });
        }, 1000);
        
        console.log('[StackBlitz Save Detector] Save detection setup complete');
      }
      
      // Initialize when DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupSaveDetection);
      } else {
        setupSaveDetection();
      }
      
      // Also try after a delay in case StackBlitz loads later
      setTimeout(setupSaveDetection, 2000);
      setTimeout(setupSaveDetection, 5000);
    })();
  `;
}

// Track challenge access time
function trackChallengeAccess(projectId: string, url: string, course?: string) {
  try {
    const accessData = {
      url,
      course,
      lastAccessed: new Date().toISOString(),
      projectId,
      accessCount: getAccessCount(projectId) + 1
    };
    localStorage.setItem(`challenge-access-${projectId}`, JSON.stringify(accessData));
  } catch (e) {
    console.warn('Failed to track challenge access:', e);
  }
}

// Save StackBlitz filesystem snapshot to localStorage
async function saveStackBlitzSnapshot(projectId: string, vm: any) {
  try {
    if (!vm || typeof vm.getFsSnapshot !== 'function') {
      console.warn('StackBlitz VM not available or getFsSnapshot not supported');
      return;
    }

    const files = await vm.getFsSnapshot();
    const serializedFiles = JSON.stringify(files);
    
    // Store with a specific key for this project
    localStorage.setItem(`stackblitz-snapshot-${projectId}`, serializedFiles);
    
    // Also store metadata
    const metadata = {
      savedAt: new Date().toISOString(),
      projectId,
      fileCount: Object.keys(files).length
    };
    localStorage.setItem(`stackblitz-metadata-${projectId}`, JSON.stringify(metadata));
    
    console.log(`[StackBlitz] Saved filesystem snapshot for project ${projectId}`);
  } catch (error) {
    console.error('Failed to save StackBlitz snapshot:', error);
  }
}

// Restore StackBlitz filesystem snapshot from localStorage
async function restoreStackBlitzSnapshot(projectId: string, vm: any) {
  try {
    if (!vm || typeof vm.applyFsDiff !== 'function') {
      console.warn('StackBlitz VM not available or applyFsDiff not supported');
      return false;
    }

    const serializedFiles = localStorage.getItem(`stackblitz-snapshot-${projectId}`);
    if (!serializedFiles) {
      console.log(`[StackBlitz] No saved snapshot found for project ${projectId}`);
      return false;
    }

    const files = JSON.parse(serializedFiles);
    await vm.applyFsDiff({ create: files, destroy: [] });
    
    console.log(`[StackBlitz] Restored filesystem snapshot for project ${projectId}`);
    return true;
  } catch (error) {
    console.error('Failed to restore StackBlitz snapshot:', error);
    return false;
  }
}

// Check if a StackBlitz snapshot exists
function hasStackBlitzSnapshot(projectId: string): boolean {
  try {
    const snapshot = localStorage.getItem(`stackblitz-snapshot-${projectId}`);
    return snapshot !== null;
  } catch (e) {
    return false;
  }
}

// Get StackBlitz snapshot metadata
function getStackBlitzSnapshotMetadata(projectId: string) {
  try {
    const metadata = localStorage.getItem(`stackblitz-metadata-${projectId}`);
    return metadata ? JSON.parse(metadata) : null;
  } catch (e) {
    return null;
  }
}

// Get access count for a challenge
function getAccessCount(projectId: string): number {
  try {
    const saved = localStorage.getItem(`challenge-access-${projectId}`);
    return saved ? JSON.parse(saved).accessCount || 0 : 0;
  } catch (e) {
    return 0;
  }
}

// Get last access time for a challenge
function getLastAccess(projectId: string): string | null {
  try {
    const saved = localStorage.getItem(`challenge-access-${projectId}`);
    return saved ? JSON.parse(saved).lastAccessed : null;
  } catch (e) {
    return null;
  }
}

export function StackBlitzToggle({ document, course, className = "" }: StackBlitzToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [challengeStats, setChallengeStats] = useState<Record<string, any>>({});
  const [stackblitzVMs, setStackblitzVMs] = useState<Record<string, any>>({});
  const [snapshotStatus, setSnapshotStatus] = useState<Record<string, any>>({});
  const [saveIndicators, setSaveIndicators] = useState<Record<string, boolean>>({});
  const [isMounted, setIsMounted] = useState(false);
  
  // Handle hydration by only rendering on client side
  useEffect(() => {
    setIsMounted(true);
    console.log('[StackBlitzToggle] Component mounted, isOpen:', isOpen);
  }, []);

  // Global message listener for StackBlitz communication
  useEffect(() => {
    if (!isMounted) return;

    const handleMessage = (event: MessageEvent) => {
      // Only handle messages from StackBlitz domains
      if (event.origin.includes('stackblitz.com') || event.origin.includes('stackblitz.io')) {
        console.log('[StackBlitz] Received message from StackBlitz:', event.data);
        
        if (event.data && event.data.type === 'stackblitz-vm-ready') {
          console.log('[StackBlitz] VM is ready!');
          // VM is ready, but we need the actual VM object to save
          // This will be handled by the iframe's onLoad handler
        }
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [isMounted]);
  
  useEffect(() => {
    console.log('[StackBlitzToggle] isOpen changed to:', isOpen);
  }, [isOpen]);
  
  // Memoize the URLs to prevent recalculation on every render
  const stackblitzUrls = useMemo(() => {
    return extractStackBlitzUrls(document, course);
  }, [document, course]);
  
  // Add/remove class to body when sidebar opens/closes
  useEffect(() => {
    // Check if we're on the client side
    if (typeof window === 'undefined') return;
    
    const body = window.document.body;
    if (!body) return;
    
    if (isOpen) {
      body.classList.add('sidebar-open');
    } else {
      body.classList.remove('sidebar-open');
    }
    
    // Cleanup on unmount
    return () => {
      if (typeof window !== 'undefined' && window.document.body) {
        window.document.body.classList.remove('sidebar-open');
      }
    };
  }, [isOpen]);

  // Keyboard shortcut for saving (Ctrl+S / Cmd+S)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        
        // Save all open projects
        Object.keys(stackblitzVMs).forEach(projectId => {
          const vm = stackblitzVMs[projectId];
          if (vm) {
            saveStackBlitzSnapshot(projectId, vm);
          }
        });
        
        console.log('[StackBlitz] Saved all projects via keyboard shortcut');
      }
    };

    window.document.addEventListener('keydown', handleKeyDown);
    return () => window.document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, stackblitzVMs]);

  // Load challenge stats and snapshot status on component mount
  useEffect(() => {
    if (stackblitzUrls.length === 0) return;
    
    const stats: Record<string, any> = {};
    const snapshotStatus: Record<string, any> = {};
    
    stackblitzUrls.forEach(url => {
      const projectId = generateProjectId(url, course);
      const accessCount = getAccessCount(projectId);
      const lastAccess = getLastAccess(projectId);
      const hasSnapshot = hasStackBlitzSnapshot(projectId);
      const snapshotMetadata = getStackBlitzSnapshotMetadata(projectId);
      
      stats[projectId] = {
        accessCount,
        lastAccess,
        hasBeenAccessed: accessCount > 0
      };
      
      snapshotStatus[projectId] = {
        hasSnapshot,
        metadata: snapshotMetadata,
        lastSaved: snapshotMetadata?.savedAt
      };
    });
    
    setChallengeStats(stats);
    setSnapshotStatus(snapshotStatus);
  }, [stackblitzUrls, course]);

  // Track access when drawer opens
  const handleOpen = useCallback(() => {
    stackblitzUrls.forEach(url => {
      const projectId = generateProjectId(url, course);
      trackChallengeAccess(projectId, url, course);
    });
    setIsOpen(true);
  }, [stackblitzUrls, course]);

  // Close drawer
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Save StackBlitz snapshot for a specific project
  const handleSaveSnapshot = useCallback(async (projectId: string) => {
    const vm = stackblitzVMs[projectId];
    if (vm) {
      // Show saving indicator
      setSaveIndicators(prev => ({ ...prev, [projectId]: true }));
      
      try {
        await saveStackBlitzSnapshot(projectId, vm);
        
        // Update snapshot status
        setSnapshotStatus(prev => ({
          ...prev,
          [projectId]: {
            hasSnapshot: true,
            metadata: getStackBlitzSnapshotMetadata(projectId),
            lastSaved: new Date().toISOString()
          }
        }));
        
        console.log(`[StackBlitz] Successfully saved project ${projectId}`);
      } catch (error) {
        console.error(`[StackBlitz] Failed to save project ${projectId}:`, error);
      } finally {
        // Hide saving indicator after a delay
        setTimeout(() => {
          setSaveIndicators(prev => ({ ...prev, [projectId]: false }));
        }, 2000);
      }
    } else {
      console.warn(`[StackBlitz] No VM available for project ${projectId}`);
    }
  }, [stackblitzVMs]);


  // Save all projects
  const handleSaveAll = useCallback(async () => {
    if (Object.keys(stackblitzVMs).length === 0) {
      console.warn('[StackBlitz] No VMs available to save');
      return;
    }
    
    const savePromises = Object.keys(stackblitzVMs).map(async (projectId) => {
      const vm = stackblitzVMs[projectId];
      if (vm) {
        await saveStackBlitzSnapshot(projectId, vm);
      }
    });
    
    await Promise.all(savePromises);
    console.log('[StackBlitz] Saved all projects');
  }, [stackblitzVMs]);

  // Check if StackBlitz iframe is being created
  const checkStackBlitzIframeCreation = useCallback(() => {
    // Only run on client side
    if (!isMounted || typeof window === 'undefined') {
      console.log('[StackBlitz] Not running on client side or not mounted');
      return;
    }
    
    console.log('[StackBlitz] Checking iframe creation...');
    console.log('StackBlitz URLs:', stackblitzUrls);
    console.log('Is Open:', isOpen);
    console.log('Component mounted:', true);
    
    // Check if the iframe should be created
    if (stackblitzUrls.length > 0) {
      console.log('[StackBlitz] Should have iframes, checking DOM...');
      
      // Look for iframes in the current component
      try {
        const componentElement = (document as any).getElementById('stackblitz-component') || 
                                (document as any).querySelector('[data-stackblitz-component]');
        if (componentElement) {
          console.log('[StackBlitz] Component found:', componentElement);
          const iframes = componentElement.getElementsByTagName('iframe');
          console.log('[StackBlitz] Iframes in component:', iframes.length);
          
          Array.from(iframes).forEach((iframe, index) => {
            const iframeElement = iframe as HTMLIFrameElement;
            console.log(`[StackBlitz] Component iframe ${index}:`, {
              src: iframeElement.src,
              id: iframeElement.id,
              className: iframeElement.className,
              loaded: iframeElement.contentDocument ? 'Yes' : 'No',
              accessible: iframeElement.contentWindow ? 'Yes' : 'No'
            });
          });
        } else {
          console.log('[StackBlitz] Component not found in DOM');
        }
      } catch (error) {
        console.log('[StackBlitz] Error checking component:', error);
      }
    } else {
      console.log('[StackBlitz] No StackBlitz URLs, no iframes should be created');
    }
  }, [stackblitzUrls, isOpen, isMounted]);

  // Debug function to check VM status
  const debugVMStatus = useCallback(() => {
    // Only run on client side
    if (!isMounted || typeof window === 'undefined') {
      console.log('[StackBlitz] Not running on client side or not mounted');
      return;
    }
    
    console.log('[StackBlitz] VM Status Debug:');
    console.log('Available VMs:', Object.keys(stackblitzVMs));
    console.log('Snapshot status:', snapshotStatus);
    console.log('StackBlitz URLs:', stackblitzUrls);
    
    // Check if iframes are accessible - try multiple approaches
    let iframes: HTMLIFrameElement[] = [];
    
    // Method 1: Look for all iframes first
    try {
      if (typeof document !== 'undefined' && (document as any).getElementsByTagName) {
        const allIframes = Array.from((document as any).getElementsByTagName('iframe')) as HTMLIFrameElement[];
        console.log('[StackBlitz] Total iframes on page:', allIframes.length);
        
        allIframes.forEach((iframe, index) => {
          console.log(`[StackBlitz] Iframe ${index}:`, {
            src: iframe.src,
            id: iframe.id,
            className: iframe.className,
            loaded: iframe.contentDocument ? 'Yes' : 'No',
            accessible: iframe.contentWindow ? 'Yes' : 'No'
          });
        });
        
        // Filter for StackBlitz iframes
        iframes = allIframes.filter(iframe => 
          iframe.src && (
            iframe.src.includes('stackblitz') || 
            iframe.src.includes('stackblitz.com') ||
            iframe.src.includes('stackblitz.io')
          )
        );
        console.log('[StackBlitz] StackBlitz iframes found:', iframes.length);
      }
    } catch (error) {
      console.log('[StackBlitz] Cannot access document.getElementsByTagName:', error);
    }
    
    // Method 2: Try querySelectorAll
    if (iframes.length === 0) {
      try {
        if (typeof document !== 'undefined' && (document as any).querySelectorAll) {
          iframes = Array.from((document as any).querySelectorAll('iframe[src*="stackblitz"]'));
          console.log('[StackBlitz] Found iframes via querySelectorAll:', iframes.length);
        }
      } catch (error) {
        console.log('[StackBlitz] Cannot access document.querySelectorAll:', error);
      }
    }
    
    // Method 3: Look in component
    if (iframes.length === 0) {
      try {
        const componentElement = (document as any).getElementById('stackblitz-component') || 
                                (document as any).querySelector('[data-stackblitz-component]');
        if (componentElement) {
          const componentIframes = Array.from(componentElement.getElementsByTagName('iframe')) as HTMLIFrameElement[];
          console.log('[StackBlitz] Iframes in component:', componentIframes.length);
          iframes = componentIframes.filter((iframe: HTMLIFrameElement) => 
            iframe.src && iframe.src.includes('stackblitz')
          );
        } else {
          console.log('[StackBlitz] Component element not found');
        }
      } catch (error) {
        console.log('[StackBlitz] Component iframe search failed:', error);
      }
    }
    
    console.log('[StackBlitz] Final iframes found:', iframes.length);
    
    iframes.forEach((iframe: HTMLIFrameElement, index: number) => {
      console.log(`[StackBlitz] Iframe ${index}:`, {
        src: iframe.src,
        loaded: iframe.contentDocument ? 'Yes' : 'No',
        accessible: iframe.contentWindow ? 'Yes' : 'No'
      });
      
      try {
        const iframeWindow = iframe.contentWindow;
        if (iframeWindow) {
          console.log(`[StackBlitz] Iframe ${index} window keys:`, Object.keys(iframeWindow).slice(0, 10));
          
          // Check for StackBlitz-specific objects
          const stackblitzKeys = Object.keys(iframeWindow).filter(key => 
            key.toLowerCase().includes('stackblitz') || 
            key.toLowerCase().includes('vm') ||
            key.toLowerCase().includes('webcontainer')
          );
          console.log(`[StackBlitz] Iframe ${index} StackBlitz keys:`, stackblitzKeys);
        }
      } catch (error) {
        console.log(`[StackBlitz] Iframe ${index} access error:`, error);
      }
    });
    
    if (Object.keys(stackblitzVMs).length === 0) {
      console.warn('[StackBlitz] No VMs detected. This means:');
      console.warn('1. StackBlitz iframe may not be fully loaded');
      console.warn('2. VM detection methods may need adjustment');
      console.warn('3. Cross-origin restrictions may be blocking access');
    } else {
      console.log('[StackBlitz] VMs detected successfully!');
      Object.keys(stackblitzVMs).forEach(projectId => {
        const vm = stackblitzVMs[projectId];
        console.log(`VM for ${projectId}:`, {
          hasGetFsSnapshot: typeof vm.getFsSnapshot === 'function',
          hasApplyFsDiff: typeof vm.applyFsDiff === 'function',
          hasOnFsChange: typeof vm.onFsChange === 'function'
        });
      });
    }
  }, [stackblitzVMs, snapshotStatus, stackblitzUrls, isMounted]);

  // Try to find VM in all iframes
  const findVMInAllIframes = useCallback(() => {
    // Only run on client side
    if (!isMounted || typeof window === 'undefined') {
      console.log('[StackBlitz] Not running on client side or not mounted');
      return;
    }
    
    console.log('[StackBlitz] Searching for VM in all iframes...');
    
    // First, try to find VM in global window
    try {
      const globalKeys = Object.keys(window);
      console.log('[StackBlitz] Global window keys:', globalKeys.slice(0, 20));
      
      for (const key of globalKeys) {
        try {
          const obj = (window as any)[key];
          if (obj && typeof obj === 'object' && typeof obj.getFsSnapshot === 'function') {
            console.log(`[StackBlitz] Found VM in global window at key: ${key}`);
            const projectId = `global-${key}`;
            handleStackBlitzReady(projectId, obj);
            return;
          }
        } catch (e) {
          // Skip inaccessible properties
        }
      }
    } catch (error) {
      console.log('[StackBlitz] Cannot access global window:', error);
    }
    
    // Then try iframes - use multiple approaches
    let iframes: HTMLIFrameElement[] = [];
    
    // Method 1: Try document.querySelectorAll
    try {
      if (typeof document !== 'undefined' && (document as any).querySelectorAll) {
        iframes = Array.from((document as any).querySelectorAll('iframe[src*="stackblitz"]'));
        console.log('[StackBlitz] Found iframes via querySelectorAll:', iframes.length);
      }
    } catch (error) {
      console.log('[StackBlitz] querySelectorAll failed:', error);
    }
    
    // Method 2: Try to find iframes manually
    if (iframes.length === 0) {
      try {
        if (typeof document !== 'undefined' && (document as any).getElementsByTagName) {
          const allIframes = Array.from((document as any).getElementsByTagName('iframe')) as HTMLIFrameElement[];
          iframes = allIframes.filter((iframe: HTMLIFrameElement) => 
            iframe.src && iframe.src.includes('stackblitz')
          );
          console.log('[StackBlitz] Found iframes via getElementsByTagName:', iframes.length);
        }
      } catch (error) {
        console.log('[StackBlitz] getElementsByTagName failed:', error);
      }
    }
    
    // Method 3: Try to find iframes in the current component's DOM
    if (iframes.length === 0) {
      try {
        // Look for iframes in the current component using a different approach
        const componentElement = (document as any).getElementById('stackblitz-component') || 
                                (document as any).querySelector('[data-stackblitz-component]');
        if (componentElement) {
          const componentIframes = Array.from(componentElement.getElementsByTagName('iframe')) as HTMLIFrameElement[];
          iframes = componentIframes.filter((iframe: HTMLIFrameElement) => 
            iframe.src && iframe.src.includes('stackblitz')
          );
          console.log('[StackBlitz] Found iframes in component:', iframes.length);
        } else {
          console.log('[StackBlitz] Component element not found');
        }
      } catch (error) {
        console.log('[StackBlitz] Component iframe search failed:', error);
      }
    }
    
    console.log('[StackBlitz] Total iframes found:', iframes.length);
    
    iframes.forEach((iframe: HTMLIFrameElement, index: number) => {
      try {
        const iframeWindow = iframe.contentWindow;
        if (iframeWindow) {
          console.log(`[StackBlitz] Checking iframe ${index} for VM...`);
          
          // Try to find VM in this iframe
          const allKeys = Object.keys(iframeWindow);
          for (const key of allKeys) {
            try {
              const obj = (iframeWindow as any)[key];
              if (obj && typeof obj === 'object' && typeof obj.getFsSnapshot === 'function') {
                console.log(`[StackBlitz] Found VM in iframe ${index} at key: ${key}`);
                const projectId = `iframe-${index}-${key}`;
                handleStackBlitzReady(projectId, obj);
                return;
              }
            } catch (e) {
              // Skip inaccessible properties
            }
          }
        }
      } catch (error) {
        console.log(`[StackBlitz] Cannot access iframe ${index}:`, error);
      }
    });
  }, []);

  // Enhanced save function that requires real VM
  const handleSaveWithFallback = useCallback(async (projectId: string) => {
    let vm = stackblitzVMs[projectId];
    
    // If no VM found, try to find one in all iframes
    if (!vm) {
      console.log('[StackBlitz] No VM found, searching all iframes...');
      findVMInAllIframes();
      
      // Wait a bit and try again
      setTimeout(() => {
        vm = stackblitzVMs[projectId];
        if (!vm) {
          console.warn(`[StackBlitz] Still no VM available for project ${projectId}. Cannot save without real StackBlitz VM.`);
          alert('Cannot save: StackBlitz VM not detected. Please ensure the StackBlitz editor is fully loaded and try again.');
          return;
        }
      }, 1000);
      return;
    }
    
    // Show saving indicator
    setSaveIndicators(prev => ({ ...prev, [projectId]: true }));
    
    try {
      await saveStackBlitzSnapshot(projectId, vm);
      
      // Update snapshot status
      setSnapshotStatus(prev => ({
        ...prev,
        [projectId]: {
          hasSnapshot: true,
          metadata: getStackBlitzSnapshotMetadata(projectId),
          lastSaved: new Date().toISOString()
        }
      }));
      
      console.log(`[StackBlitz] Successfully saved project ${projectId}`);
    } catch (error) {
      console.error(`[StackBlitz] Failed to save project ${projectId}:`, error);
    } finally {
      // Hide saving indicator after a delay
      setTimeout(() => {
        setSaveIndicators(prev => ({ ...prev, [projectId]: false }));
      }, 2000);
    }
  }, [stackblitzVMs, findVMInAllIframes]);

  // Restore StackBlitz snapshot for a specific project
  const handleRestoreSnapshot = useCallback(async (projectId: string) => {
    const vm = stackblitzVMs[projectId];
    if (vm) {
      const restored = await restoreStackBlitzSnapshot(projectId, vm);
      if (restored) {
        console.log(`[StackBlitz] Restored snapshot for project ${projectId}`);
      }
    }
  }, [stackblitzVMs]);

  // Handle StackBlitz VM ready event
  const handleStackBlitzReady = useCallback((projectId: string, vm: any) => {
    setStackblitzVMs(prev => ({
      ...prev,
      [projectId]: vm
    }));
    
    // Auto-restore snapshot if available
    if (hasStackBlitzSnapshot(projectId)) {
      restoreStackBlitzSnapshot(projectId, vm);
    }

    // Set up auto-save on file changes
    if (vm && typeof vm.onFsChange === 'function') {
      vm.onFsChange(async () => {
        console.log(`[StackBlitz] Files changed for project ${projectId}, auto-saving...`);
        await saveStackBlitzSnapshot(projectId, vm);
      });
    }
  }, []);

  // Periodic auto-save when StackBlitz is open
  useEffect(() => {
    if (!isOpen || Object.keys(stackblitzVMs).length === 0) return;

    const autoSaveInterval = setInterval(async () => {
      console.log('[StackBlitz] Periodic auto-save triggered');
      Object.keys(stackblitzVMs).forEach(async (projectId) => {
        const vm = stackblitzVMs[projectId];
        if (vm) {
          try {
            await saveStackBlitzSnapshot(projectId, vm);
            console.log(`[StackBlitz] Auto-saved project ${projectId}`);
          } catch (error) {
            console.warn(`[StackBlitz] Failed to auto-save project ${projectId}:`, error);
          }
        }
      });
    }, 10000); // Auto-save every 10 seconds

    return () => clearInterval(autoSaveInterval);
  }, [isOpen, stackblitzVMs]);
  
  // Don't render on server side to prevent hydration issues
  if (!isMounted) {
    return null;
  }
  
  if (stackblitzUrls.length === 0) {
    return null;
  }
  
  return (
    <>
      {/* Toggle Button - Fixed position on the right */}
      <div className="fixed right-4 bottom-4 z-40">
        <Button
          onClick={isOpen ? handleClose : handleOpen}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-lg px-4 py-2"
        >
          <Code className="h-4 w-4 mr-2" />
          {isOpen ? 'Close Challenge' : 'Start Challenge'}
        </Button>
      </div>

      {/* Bottom Drawer */}
      <div 
        id="stackblitz-component"
        className={`fixed bottom-0 left-0 right-0 h-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`} 
        data-stackblitz-component
      >
        {/* Content */}
        <div className="h-full overflow-y-auto">
          {stackblitzUrls.map((url, index) => {
            const projectId = generateProjectId(url, course);
            const embedUrl = getStackBlitzEmbedUrl(url);
            const stats = challengeStats[projectId];
            
            return (
              <div key={index} className="h-full flex flex-col">
                <div className="p-3 bg-gray-50 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-gray-600">StackBlitz Project {index + 1}</p>
                      {stats?.hasBeenAccessed && (
                        <div className="flex items-center gap-1 text-xs text-blue-600">
                          <Clock className="h-3 w-3" />
                          <span>Accessed {stats.accessCount} time{stats.accessCount !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open in new tab
                      </a>
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
                  
                  {/* Important Notice */}
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Note:</strong> Changes made in the embedded editor are temporary and will be lost when you refresh the page. 
                        For permanent changes, use the "Open in new tab" link to work in the full StackBlitz environment.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 relative">
                  <iframe
                    src={embedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 'none' }}
                    allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
                    sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                    loading="lazy"
                    title={`StackBlitz Project ${index + 1}`}
                    className="w-full h-full"
                    onError={(e) => {
                      console.warn('[StackBlitz] Iframe load error (may be expected):', e);
                    }}
                    onLoad={(e) => {
                      // Set up message listener for StackBlitz events
                      try {
                        const iframe = e.target as HTMLIFrameElement;
                        if (iframe && iframe.contentWindow) {
                          // Listen for StackBlitz events
                          iframe.contentWindow.addEventListener('message', (event) => {
                            console.log('[StackBlitz] Received message:', event.data);
                            
                            // Handle different StackBlitz events
                            if (event.data && event.data.type === 'stackblitz-vm-ready') {
                              handleStackBlitzReady(projectId, event.data.vm);
                            }
                            
                            // Listen for save events from StackBlitz
                            if (event.data && event.data.type === 'stackblitz-save') {
                              console.log('[StackBlitz] Save event detected, saving to localStorage...');
                              handleSaveSnapshot(projectId);
                            }
                            
                            // Listen for file changes
                            if (event.data && event.data.type === 'stackblitz-fs-change') {
                              console.log('[StackBlitz] File system changed, auto-saving...');
                              handleSaveSnapshot(projectId);
                            }
                          });
                          
                          // Try to request VM from StackBlitz iframe
                          setTimeout(() => {
                            try {
                              iframe.contentWindow?.postMessage({
                                type: 'request-stackblitz-vm',
                                projectId: projectId
                              }, '*');
                              console.log('[StackBlitz] Requested VM from iframe');
                            } catch (error) {
                              console.warn('[StackBlitz] Failed to request VM from iframe:', error);
                            }
                          }, 2000);
                          
                          // Try multiple approaches to access StackBlitz VM
                          const tryAccessVM = () => {
                            try {
                              const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                              const iframeWindow = iframe.contentWindow;
                              
                              if (iframeWindow) {
                                console.log('[StackBlitz] Attempting VM detection...');
                                
                                // Method 1: Try to access StackBlitz VM directly
                                if ((iframeWindow as any).stackblitz?.vm) {
                                  console.log('[StackBlitz] Found VM via stackblitz.vm');
                                  handleStackBlitzReady(projectId, (iframeWindow as any).stackblitz.vm);
                                  return;
                                }
                                
                                // Method 2: Try to access VM from global scope
                                if ((iframeWindow as any).vm) {
                                  console.log('[StackBlitz] Found VM via global vm');
                                  handleStackBlitzReady(projectId, (iframeWindow as any).vm);
                                  return;
                                }
                                
                                // Method 3: Try to find VM in window properties
                                const vmKeys = Object.keys(iframeWindow).filter(key => 
                                  key.toLowerCase().includes('vm') || 
                                  key.toLowerCase().includes('stackblitz') ||
                                  key.toLowerCase().includes('webcontainer')
                                );
                                console.log('[StackBlitz] Available keys:', vmKeys);
                                
                                for (const key of vmKeys) {
                                  const obj = (iframeWindow as any)[key];
                                  if (obj && typeof obj.getFsSnapshot === 'function') {
                                    console.log(`[StackBlitz] Found VM at key: ${key}`);
                                    handleStackBlitzReady(projectId, obj);
                                    return;
                                  }
                                }
                                
                                // Method 4: Try to access VM from iframe document
                                if (iframeDoc) {
                                  const scripts = iframeDoc.querySelectorAll('script');
                                  console.log('[StackBlitz] Found scripts in iframe:', scripts.length);
                                  
                                  // Look for StackBlitz initialization
                                  scripts.forEach((script, index) => {
                                    if (script.textContent?.includes('stackblitz') || 
                                        script.textContent?.includes('vm')) {
                                      console.log(`[StackBlitz] Found relevant script ${index}:`, script.textContent.substring(0, 100));
                                    }
                                  });
                                }
                                
                                // Method 5: Try to access VM from iframe's parent or global scope
                                try {
                                  const parentWindow = iframeWindow.parent;
                                  if (parentWindow && parentWindow !== iframeWindow) {
                                    if ((parentWindow as any).stackblitz?.vm) {
                                      console.log('[StackBlitz] Found VM via parent stackblitz.vm');
                                      handleStackBlitzReady(projectId, (parentWindow as any).stackblitz.vm);
                                      return;
                                    }
                                  }
                                } catch (e) {
                                  console.log('[StackBlitz] Cannot access parent window:', e);
                                }
                                
                                // Method 6: Try to find VM in iframe's global scope more thoroughly
                                const allKeys = Object.keys(iframeWindow);
                                console.log('[StackBlitz] All iframe window keys:', allKeys.slice(0, 20)); // Show first 20 keys
                                
                                for (const key of allKeys) {
                                  try {
                                    const obj = (iframeWindow as any)[key];
                                    if (obj && typeof obj === 'object' && typeof obj.getFsSnapshot === 'function') {
                                      console.log(`[StackBlitz] Found VM-like object at key: ${key}`);
                                      handleStackBlitzReady(projectId, obj);
                                      return;
                                    }
                                  } catch (e) {
                                    // Skip inaccessible properties
                                  }
                                }
                                
                                console.warn('[StackBlitz] No VM found in iframe');
                              } else {
                                console.warn('[StackBlitz] Cannot access iframe window');
                              }
                            } catch (error) {
                              console.warn('[StackBlitz] Failed to access VM:', error);
                            }
                          };
                          
                          // Try immediately
                          tryAccessVM();
                          
                          // Try after delays
                          setTimeout(tryAccessVM, 1000);
                          setTimeout(tryAccessVM, 3000);
                          setTimeout(tryAccessVM, 5000);
                          setTimeout(tryAccessVM, 10000); // Try one more time after 10 seconds
                          
                          // Inject save detection script into iframe
                          setTimeout(() => {
                            try {
                              const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                              if (iframeDoc) {
                                // Create and inject the save detection script
                                const script = iframeDoc.createElement('script');
                                script.textContent = createStackBlitzSaveDetector(projectId);
                                iframeDoc.head.appendChild(script);
                                console.log('[StackBlitz] Save detection script injected');
                              }
                            } catch (error) {
                              console.warn('Failed to inject save detection script (cross-origin):', error);
                              // This is expected for cross-origin iframes
                              // We'll use postMessage communication instead
                            }
                          }, 3000); // Wait for StackBlitz to fully load
                        }
                      } catch (error) {
                        console.warn('Failed to setup StackBlitz listener:', error);
                        // This is expected due to cross-origin restrictions
                        // We'll rely on the injected script and message passing instead
                      }
                    }}
                  />
                  
                  {/* Snapshot Controls Overlay */}
                  <div className="absolute top-2 right-2 flex gap-2">
                    {snapshotStatus[projectId]?.hasSnapshot && (
                      <Button
                        onClick={() => handleRestoreSnapshot(projectId)}
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs bg-white/90 hover:bg-white"
                      >
                        Restore
                      </Button>
                    )}
                    <Button
                      onClick={() => handleSaveWithFallback(projectId)}
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs bg-white/90 hover:bg-white"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={handleSaveAll}
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs bg-white/90 hover:bg-white"
                    >
                      Save All
                    </Button>
                    <Button
                      onClick={debugVMStatus}
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs bg-blue-100 hover:bg-blue-200"
                    >
                      Debug VM
                    </Button>
                    <Button
                      onClick={findVMInAllIframes}
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs bg-green-100 hover:bg-green-200"
                    >
                      Find VM
                    </Button>
                    <Button
                      onClick={checkStackBlitzIframeCreation}
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs bg-purple-100 hover:bg-purple-200"
                    >
                      Check Iframe
                    </Button>
                    <Button
                      onClick={() => {
                        console.log('[StackBlitz] Current URLs:');
                        stackblitzUrls.forEach((url, index) => {
                          const embedUrl = getStackBlitzEmbedUrl(url);
                          console.log(`[StackBlitz] URL ${index}:`, {
                            original: url,
                            embed: embedUrl
                          });
                        });
                      }}
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs bg-orange-100 hover:bg-orange-200"
                    >
                      Show URLs
                    </Button>
                  </div>
                  
                  {/* Snapshot Status Indicator */}
                  {snapshotStatus[projectId]?.hasSnapshot && (
                    <div className="absolute bottom-2 left-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                      Saved {snapshotStatus[projectId]?.lastSaved ? 
                        new Date(snapshotStatus[projectId].lastSaved).toLocaleString() : 
                        'recently'
                      }
                    </div>
                  )}
                  
                  {/* Saving Indicator */}
                  {saveIndicators[projectId] && (
                    <div className="absolute bottom-2 right-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded flex items-center gap-1">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                      Saving...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// Export a dynamically imported version to prevent hydration issues
export const DynamicStackBlitzToggle = dynamic(
  () => Promise.resolve(StackBlitzToggle),
  {
    ssr: false,
    loading: () => null // Return null to prevent any hydration issues
  }
);

// Alternative: Completely client-side only component
export function ClientOnlyStackBlitzToggle(props: StackBlitzToggleProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <StackBlitzToggle {...props} />;
}

// Most isolated version - only renders after full hydration
export function HydrationSafeStackBlitzToggle(props: StackBlitzToggleProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Wait for next tick to ensure full hydration
    const timer = setTimeout(() => {
      setIsHydrated(true);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  if (!isHydrated) {
    return null;
  }

  return <StackBlitzToggle {...props} />;
} 