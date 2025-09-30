"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Code, ExternalLink, Save, File, Play } from "lucide-react";

interface CodeEditorProps {
  initialFiles?: Record<string, string>;
  course?: string;
  challengeId?: string;
}

export function CodeEditor({ initialFiles = {}, course, challengeId }: CodeEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<Record<string, string>>(initialFiles);
  const [activeFile, setActiveFile] = useState<string>("index.html");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<any>(null);

  // Default files if none provided
  const defaultFiles = {
    "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Challenge</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Hello World!</h1>
    <p>Start coding your challenge here.</p>
    <script src="script.js"></script>
</body>
</html>`,
    "style.css": `body {
    font-family: Arial, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f5f5f5;
}

h1 {
    color: #333;
    text-align: center;
}

p {
    color: #666;
    line-height: 1.6;
}`,
    "script.js": `// Your JavaScript code here
console.log('Challenge started!');

// Add your code below
document.addEventListener('DOMContentLoaded', function() {
    // Your code here
});`
  };

  // Initialize files
  useEffect(() => {
    if (Object.keys(files).length === 0) {
      setFiles(defaultFiles);
    }
  }, []);

  // Load saved files from localStorage
  useEffect(() => {
    if (challengeId) {
      const saved = localStorage.getItem(`challenge-${challengeId}`);
      if (saved) {
        try {
          const savedFiles = JSON.parse(saved);
          setFiles(savedFiles);
        } catch (e) {
          console.warn('Failed to load saved files:', e);
        }
      }
      
      // Load last save time
      const timestamp = localStorage.getItem(`challenge-${challengeId}-timestamp`);
      if (timestamp) {
        setLastSaveTime(new Date(parseInt(timestamp)));
      }
    }
  }, [challengeId]);

  // Save files to localStorage
  const saveFiles = () => {
    if (challengeId) {
      localStorage.setItem(`challenge-${challengeId}`, JSON.stringify(files));
      const currentTime = Date.now();
      localStorage.setItem(`challenge-${challengeId}-timestamp`, currentTime.toString());
      setLastSaveTime(new Date(currentTime));
    }
  };

  // Auto-save when files change
  useEffect(() => {
    if (Object.keys(files).length > 0) {
      saveFiles();
    }
  }, [files, challengeId]);

  // Timer to update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  // Initialize Monaco Editor
  useEffect(() => {
    if (isOpen && editorRef.current && !monacoRef.current) {
      import('monaco-editor').then((monaco) => {
        monacoRef.current = monaco.editor.create(editorRef.current!, {
          value: files[activeFile] || '',
          language: getLanguageFromFile(activeFile),
          theme: 'vs-dark',
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          wordWrap: 'on'
        });

        // Listen for changes
        monacoRef.current.onDidChangeModelContent(() => {
          const value = monacoRef.current.getValue();
          setFiles(prev => ({
            ...prev,
            [activeFile]: value
          }));
        });
      });
    }

    return () => {
      if (monacoRef.current) {
        monacoRef.current.dispose();
        monacoRef.current = null;
      }
    };
  }, [isOpen, activeFile]);

  // Update editor content when active file changes
  useEffect(() => {
    if (monacoRef.current && files[activeFile]) {
      monacoRef.current.setValue(files[activeFile] || '');
      monacoRef.current.setModelLanguage(monacoRef.current.getModel(), getLanguageFromFile(activeFile));
    }
  }, [activeFile, files]);

  // Generate preview URL
  useEffect(() => {
    if (isOpen && files['index.html']) {
      const blob = new Blob([files['index.html']], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    }
  }, [isOpen, files]);

  const getLanguageFromFile = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'html': return 'html';
      case 'css': return 'css';
      case 'js': return 'javascript';
      case 'json': return 'json';
      case 'md': return 'markdown';
      default: return 'plaintext';
    }
  };

  const createNewFile = () => {
    const filename = prompt('Enter filename:');
    if (filename && !files[filename]) {
      setFiles(prev => ({
        ...prev,
        [filename]: ''
      }));
      setActiveFile(filename);
    }
  };

  const deleteFile = (filename: string) => {
    if (Object.keys(files).length > 1) {
      setFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[filename];
        return newFiles;
      });
      if (activeFile === filename) {
        setActiveFile(Object.keys(files).find(f => f !== filename) || '');
      }
    }
  };

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
      <div className={`fixed bottom-0 left-0 right-0 h-[50vh] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}>
        {/* Header */}
        <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-900">Code Editor</h3>
            <div className="flex items-center gap-1 text-xs text-green-600">
              <Save className="h-3 w-3" />
              <span>{getLastSaveText()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
          {/* File Explorer */}
          <div className="w-48 bg-gray-100 border-r p-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Files</span>
              <Button
                onClick={createNewFile}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <File className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-1">
              {Object.keys(files).map(filename => (
                <div
                  key={filename}
                  className={`flex items-center justify-between p-1 rounded text-sm cursor-pointer ${
                    activeFile === filename ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200'
                  }`}
                  onClick={() => setActiveFile(filename)}
                >
                  <span className="truncate">{filename}</span>
                  {Object.keys(files).length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFile(filename);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1" ref={editorRef} />
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