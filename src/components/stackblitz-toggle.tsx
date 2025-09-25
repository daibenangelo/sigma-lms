"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import type { Document } from "@contentful/rich-text-types";
import { INLINES } from "@contentful/rich-text-types";
import { Button } from "@/components/ui/button";
import { X, Code, ExternalLink, Clock, AlertCircle } from "lucide-react";

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
      embedUrl.searchParams.set('file', 'src/index.js'); // Default file to show
      embedUrl.searchParams.set('hideNavigation', '1');
      embedUrl.searchParams.set('hideDevTools', '0');
      embedUrl.searchParams.set('view', 'both'); // Show both editor and preview
      
      return embedUrl.toString();
    }
    
    return url;
  } catch (e) {
    console.warn('Failed to parse StackBlitz URL:', url, e);
    return url;
  }
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
  
  // Debug: Log when component mounts and state changes
  useEffect(() => {
    console.log('[StackBlitzToggle] Component mounted, isOpen:', isOpen);
  }, []);
  
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

  // Load challenge stats on component mount
  useEffect(() => {
    if (stackblitzUrls.length === 0) return;
    
    const stats: Record<string, any> = {};
    stackblitzUrls.forEach(url => {
      const projectId = generateProjectId(url, course);
      const accessCount = getAccessCount(projectId);
      const lastAccess = getLastAccess(projectId);
      
      stats[projectId] = {
        accessCount,
        lastAccess,
        hasBeenAccessed: accessCount > 0
      };
    });
    setChallengeStats(stats);
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
      <div className={`fixed bottom-0 left-0 right-0 h-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}>
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
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
} 