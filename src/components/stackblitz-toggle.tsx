"use client";

import React, { useState, useEffect } from "react";
import type { Document } from "@contentful/rich-text-types";
import { INLINES } from "@contentful/rich-text-types";
import { Button } from "@/components/ui/button";
import { X, Code, ExternalLink } from "lucide-react";

interface StackBlitzToggleProps {
  document: Document;
  className?: string;
}

// Utility function to extract StackBlitz URLs from a rich text document
function extractStackBlitzUrls(document: Document): string[] {
  const urls: string[] = [];
  
  const walkNodes = (node: any) => {
    if (!node) return;
    
    // Check for hyperlinks
    if (node.nodeType === INLINES.HYPERLINK) {
      const url = node.data?.uri;
      if (url && (url.includes('stackblitz.com') || url.includes('stackblitz.io'))) {
        urls.push(url);
      }
    }
    
    // Check for text nodes that might contain URLs
    if (node.nodeType === 'text' && node.value) {
      const stackblitzRegex = /https?:\/\/(?:www\.)?(?:stackblitz\.com|stackblitz\.io)\/[^\s)]+/g;
      const matches = node.value.match(stackblitzRegex);
      if (matches) {
        urls.push(...matches);
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

export function StackBlitzToggle({ document, className = "" }: StackBlitzToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const stackblitzUrls = extractStackBlitzUrls(document);
  
  // Add/remove class to body when sidebar opens/closes
  useEffect(() => {
    // Check if we're on the client side and document.body exists
    if (typeof window === 'undefined' || !document?.body) return;
    
    if (isOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    
    // Cleanup on unmount
    return () => {
      if (typeof window !== 'undefined' && document?.body) {
        document.body.classList.remove('sidebar-open');
      }
    };
  }, [isOpen]);
  
  if (stackblitzUrls.length === 0) {
    return null;
  }
  
  return (
    <>
      {/* Toggle Button - Fixed position on the right */}
      <div className="fixed right-4 bottom-4 z-40">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-full p-3"
          size="icon"
        >
          <Code className="h-5 w-5" />
        </Button>
      </div>

      {/* Bottom Drawer */}
      <div className={`fixed bottom-0 left-0 right-0 h-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}>
        {/* Content */}
        <div className="h-full overflow-y-auto">
          {stackblitzUrls.map((url, index) => {
            const embedUrl = getStackBlitzEmbedUrl(url);
            return (
              <div key={index} className="h-full flex flex-col">
                <div className="p-3 bg-gray-50 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">StackBlitz Project {index + 1}</p>
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
                        onClick={() => setIsOpen(false)}
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                      >
                        <X className="h-3 w-3" />
                      </Button>
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