"use client";

import React from "react";
import type { Document } from "@contentful/rich-text-types";
import { BLOCKS, INLINES } from "@contentful/rich-text-types";

interface StackBlitzEmbedProps {
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
      // Example: https://stackblitz.com/edit/project-name -> https://stackblitz.com/edit/project-name?embed=1
      
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

export function StackBlitzEmbed({ document, className = "" }: StackBlitzEmbedProps) {
  const stackblitzUrls = extractStackBlitzUrls(document);
  
  if (stackblitzUrls.length === 0) {
    return null;
  }
  
  return (
    <div className={`space-y-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900">Interactive Code Editor</h3>
      {stackblitzUrls.map((url, index) => {
        const embedUrl = getStackBlitzEmbedUrl(url);
        return (
          <div
            key={index}
            className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm"
          >
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">StackBlitz Code Editor</p>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Open in new tab
                </a>
              </div>
            </div>
            <div className="relative">
              <iframe
                src={embedUrl}
                width="100%"
                height="500"
                style={{ border: 'none' }}
                allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
                sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                loading="lazy"
                title={`StackBlitz Project ${index + 1}`}
                className="w-full"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
