"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Code, ExternalLink, Save } from "lucide-react";

interface WebContainerEditorProps {
  course?: string;
  challengeId?: string;
}

export function WebContainerEditor({ course, challengeId }: WebContainerEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [webcontainer, setWebcontainer] = useState<any>(null);
  const [files, setFiles] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize WebContainer
  useEffect(() => {
    if (isOpen && !webcontainer) {
      initializeWebContainer();
    }
  }, [isOpen]);

  const initializeWebContainer = async () => {
    setIsLoading(true);
    try {
      // Dynamic import to avoid SSR issues
      const { WebContainer } = await import('@webcontainer/api');
      
      const container = await WebContainer.boot();
      setWebcontainer(container);

      // Load saved files or use defaults
      const savedFiles = challengeId ? 
        JSON.parse(localStorage.getItem(`challenge-${challengeId}`) || '{}') : 
        {};

      const defaultFiles = {
        'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Challenge</title>
</head>
<body>
    <h1>Hello World!</h1>
    <p>Start coding your challenge here.</p>
</body>
</html>`,
        'package.json': JSON.stringify({
          name: 'challenge',
          version: '1.0.0',
          scripts: {
            dev: 'vite',
            build: 'vite build'
          },
          devDependencies: {
            vite: '^4.0.0'
          }
        }, null, 2)
      };

      const filesToMount = Object.keys(savedFiles).length > 0 ? savedFiles : defaultFiles;
      
      await container.mount(filesToMount);
      setFiles(filesToMount);

      // Start dev server
      const installProcess = await container.spawn('npm', ['install']);
      await installProcess.exit;

      const devProcess = await container.spawn('npm', ['run', 'dev']);
      
      // Get the preview URL
      container.on('server-ready', (port, url) => {
        console.log('Server ready at:', url);
        // You can set the preview URL here
      });

    } catch (error) {
      console.error('Failed to initialize WebContainer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save files to localStorage
  const saveFiles = async () => {
    if (webcontainer && challengeId) {
      try {
        const fileTree = await webcontainer.fs.readdir('/', { withFileTypes: true });
        const files: Record<string, string> = {};
        
        for (const file of fileTree) {
          if (file.isFile()) {
            const content = await webcontainer.fs.readFile(`/${file.name}`, 'utf-8');
            files[file.name] = content;
          }
        }
        
        localStorage.setItem(`challenge-${challengeId}`, JSON.stringify(files));
        setFiles(files);
      } catch (error) {
        console.error('Failed to save files:', error);
      }
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
      <div className="fixed bottom-0 left-0 right-0 h-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50">
        {/* Header */}
        <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-900">WebContainer Editor</h3>
            {isLoading && <span className="text-sm text-gray-500">Loading...</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={saveFiles}
              variant="ghost"
              size="sm"
              className="h-6 px-2"
            >
              <Save className="h-3 w-3 mr-1" />
              Save
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
          <div className="flex-1 p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Initializing WebContainer...</p>
                </div>
              </div>
            ) : (
              <div ref={containerRef} className="h-full">
                {/* WebContainer will mount here */}
                <p className="text-sm text-gray-500">WebContainer editor will be embedded here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 