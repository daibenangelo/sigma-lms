"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Code, ExternalLink, Save, Play } from "lucide-react";

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
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Load saved code from localStorage
  useEffect(() => {
    if (challengeId) {
      const saved = localStorage.getItem(`challenge-${challengeId}`);
      if (saved) {
        setCode(saved);
      }
      
      // Load last save time
      const timestamp = localStorage.getItem(`challenge-${challengeId}-timestamp`);
      if (timestamp) {
        setLastSaveTime(new Date(parseInt(timestamp)));
      }
    }
  }, [challengeId]);

  // Save code to localStorage
  const saveCode = () => {
    if (challengeId) {
      localStorage.setItem(`challenge-${challengeId}`, code);
      const currentTime = Date.now();
      localStorage.setItem(`challenge-${challengeId}-timestamp`, currentTime.toString());
      setLastSaveTime(new Date(currentTime));
    }
  };

  // Run script function (for demonstration)
  const runScript = () => {
    console.log('[CodeMirror] Run button clicked');
    setRunMessage('✅ Code would execute here (CodeMirror editor)');

    // Clear the message after 2 seconds
    setTimeout(() => {
      setRunMessage(null);
    }, 2000);
  };

  // Auto-save when code changes
  useEffect(() => {
    if (code) {
      saveCode();
    }
  }, [code, challengeId]);

  // Timer to update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  // Generate preview URL
  useEffect(() => {
    if (isOpen && code) {
      const blob = new Blob([code], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    }
  }, [isOpen, code]);

  // Format last save time
  const getLastSaveText = () => {
    if (!lastSaveTime) {
      return 'Auto-saved';
    }
    
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
  };

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
      <div className="fixed bottom-0 left-0 right-0 h-[50vh] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50">
        {/* Header */}
        <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-900">Code Editor</h3>
            <div className="flex items-center gap-1 text-xs text-green-600">
              <Save className="h-3 w-3" />
              <span>{getLastSaveText()}</span>
            </div>
            {runMessage && (
              <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {runMessage}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={runScript}
              size="sm"
              variant="outline"
              className="h-6 px-2"
            >
              <Play className="h-3 w-3 mr-1" />
              Run
            </Button>
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