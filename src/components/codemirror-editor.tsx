"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Code, ExternalLink, Save } from "lucide-react";

interface CodeMirrorEditorProps {
  initialCode?: string;
  language?: string;
  course?: string;
  challengeId?: string;
}

export function CodeMirrorEditor({ 
  initialCode = '', 
  language = 'html', 
  course, 
  challengeId 
}: CodeMirrorEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState(initialCode);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Load saved code from localStorage
  useEffect(() => {
    if (challengeId) {
      const saved = localStorage.getItem(`challenge-${challengeId}`);
      if (saved) {
        setCode(saved);
      }
    }
  }, [challengeId]);

  // Save code to localStorage
  const saveCode = () => {
    if (challengeId) {
      localStorage.setItem(`challenge-${challengeId}`, code);
    }
  };

  // Auto-save when code changes
  useEffect(() => {
    if (code) {
      saveCode();
    }
  }, [code, challengeId]);

  // Generate preview URL
  useEffect(() => {
    if (isOpen && code) {
      const blob = new Blob([code], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    }
  }, [isOpen, code]);

  if (!isOpen) {
    return (
      <div className="fixed right-4 bottom-4 z-40">
        <Button
          onClick={() => setIsOpen(true)}
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
      <div className="fixed bottom-0 left-0 right-0 h-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50">
        {/* Header */}
        <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-900">Code Editor</h3>
            <div className="flex items-center gap-1 text-xs text-green-600">
              <Save className="h-3 w-3" />
              <span>Auto-saved</span>
            </div>
          </div>
          <Button
            onClick={() => setIsOpen(false)}
            variant="ghost"
            size="icon"
            className="h-6 w-6"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex h-full">
          {/* Editor */}
          <div className="flex-1 flex flex-col">
            <textarea
              ref={editorRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 w-full p-4 font-mono text-sm border-0 resize-none focus:outline-none"
              placeholder="Start coding your challenge here..."
              spellCheck={false}
            />
          </div>

          {/* Preview */}
          <div className="w-1/2 border-l">
            <div className="h-full flex flex-col">
              <div className="p-2 bg-gray-50 border-b flex items-center justify-between">
                <span className="text-sm font-medium">Preview</span>
                <Button
                  onClick={() => window.open(previewUrl, '_blank')}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Open
                </Button>
              </div>
              <iframe
                src={previewUrl}
                className="flex-1 w-full border-0"
                title="Preview"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 