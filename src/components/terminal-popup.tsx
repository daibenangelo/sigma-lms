"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Terminal } from "lucide-react";

interface TerminalPopupProps {
  isOpen: boolean;
  onClose: () => void;
  scriptContent: string;
  projectId: string;
}

export function TerminalPopup({ isOpen, onClose, scriptContent, projectId }: TerminalPopupProps) {
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isLoading, setIsLoading] = useState(false);
  const [executionCount, setExecutionCount] = useState(0);
  const outputRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Reset execution count and console logs when terminal opens
  useEffect(() => {
    if (isOpen) {
      // Reset execution count and console logs when terminal opens
      setExecutionCount(prev => prev + 1);
      setConsoleLogs([]);
      setIsLoading(true); // Start loading when terminal opens
    }
  }, [isOpen]);

  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as Element).closest('.terminal-header')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add/remove drag event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Execute script when terminal opens
  useEffect(() => {
    if (isOpen && scriptContent) {
      // Check if this looks like actual script content or default/fallback content
      const isDefaultContent = scriptContent.includes('// No script content found') ||
                              scriptContent.includes('// Error loading') ||
                              scriptContent.includes('// Default script content') ||
                              scriptContent.includes('// No project snapshot available') ||
                              scriptContent.includes('console.log(\'Hello from StackBlitz!\')');

        if (!isDefaultContent) {
          // Store original console methods
          const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
          };

          // Override console methods to capture output
          const capturedLogs: string[] = [];
          console.log = (...args) => {
            const message = args.map(arg =>
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            capturedLogs.push(`[LOG] ${message}`);
          };
          console.error = (...args) => {
            const message = args.map(arg =>
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            capturedLogs.push(`[ERROR] ${message}`);
          };
          console.warn = (...args) => {
            const message = args.map(arg =>
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            capturedLogs.push(`[WARN] ${message}`);
          };
          console.info = (...args) => {
            const message = args.map(arg =>
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            capturedLogs.push(`[INFO] ${message}`);
          };

          try {
            // Create a safe execution context and execute the script
            const executeScript = new Function(`
              try {
                ${scriptContent}
              } catch (e) {
                console.error('Script execution error:', e);
              }
            `);

            // Execute the script - this will use our overridden console methods
            executeScript();

            // Set the captured logs
            setConsoleLogs(capturedLogs);


          } catch (error) {
            console.error('Failed to execute script:', error);
            setConsoleLogs(prev => [...prev, `[ERROR] Script execution failed: ${error instanceof Error ? error.message : String(error)}`]);
          } finally {
            // Restore original console methods
            console.log = originalConsole.log;
            console.error = originalConsole.error;
            console.warn = originalConsole.warn;
            console.info = originalConsole.info;
          }
        }
    }
  }, [isOpen, scriptContent, executionCount]);

  // Initialize terminal output with script content and loading animation
  useEffect(() => {
    if (isOpen && scriptContent) {
      // Show loading animation first
      setIsLoading(true);
      setTerminalOutput([
        '🚀 Code Runner',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        '🔄 Running your code...',
        '',
        '⏳ Please wait...'
      ]);

      // Simulate loading for 1.5 seconds
      setTimeout(() => {
        setIsLoading(false);

        const scriptLines = scriptContent.split('\n');

        // Check if this looks like actual script content or default/fallback content
        const isDefaultContent = scriptContent.includes('// No script content found') ||
                                scriptContent.includes('// Error loading') ||
                                scriptContent.includes('// Default script content') ||
                                scriptContent.includes('// No project snapshot available') ||
                                scriptContent.includes('console.log(\'Hello from StackBlitz!\')');

        if (isDefaultContent) {
          // Show error message for missing content
          setTerminalOutput([
            '❌ No code found to run.',
            '💡 Please write some code in the editor first.',
            '💡 Then click "Run" to see your code here.',
            '',
          ]);
        } else {
          // Show code execution message and console output
          const filteredLogs = consoleLogs.filter(log => !log.includes('[Terminal]'));

          // If no console output, check if script has any console statements
          const hasConsoleStatements = scriptContent.includes('console.log') ||
                                     scriptContent.includes('console.error') ||
                                     scriptContent.includes('console.warn') ||
                                     scriptContent.includes('console.info');

          let outputLines: string[];
          if (filteredLogs.length > 0) {
            outputLines = filteredLogs.map(log => {
              const match = log.match(/^\[(LOG|ERROR|WARN|INFO)\]\s*(.*)/);
              return match ? match[2] : log;
            });
          } else if (hasConsoleStatements) {
            outputLines = ['Script executed but no console output was captured.'];
          } else {
            outputLines = ['Script executed successfully! (No console.log statements found in your code)'];
          }

          setTerminalOutput([
            '✅ Code executed successfully!',
            '',
            '📋 Your code output:',
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            ...outputLines,
            '',
          ]);
        }
      }, 1500);
    } else if (isOpen) {
      setTerminalOutput([
        '💡 Code Runner',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        '📋 No code to run.',
        '💡 Write some code in the editor and click "Run" to see it here.'
      ]);
    }
  }, [isOpen, scriptContent, executionCount]);

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [terminalOutput]);



  if (!isOpen) return null;

  return (
    <>
      {/* Click outside to close */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div
        ref={terminalRef}
        className="fixed z-50 w-full max-w-4xl h-[55vh] flex flex-col cursor-move"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'none'
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="bg-gray-900 text-gray-100 rounded-lg shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div className="terminal-header flex items-center justify-between p-4 border-b border-gray-700 select-none">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-green-400" />
            <h2 className="text-lg font-semibold">Code Runner</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onClose}
              size="sm"
              variant="ghost"
              className="text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Terminal Output */}
        <div
          ref={outputRef}
          className="flex-1 p-4 overflow-auto font-mono text-sm bg-gray-950"
          style={{ scrollbarWidth: 'thin' }}
          onClick={(e) => e.stopPropagation()}
        >
          {terminalOutput.map((line, index) => (
            <div key={index} className={`whitespace-pre-wrap ${line.startsWith('>') ? 'text-green-400' : line.startsWith('❌') || line.startsWith('❓') ? 'text-red-400' : line.startsWith('✅') || line.startsWith('🚀') || line.startsWith('💡') || line.startsWith('📋') ? 'text-blue-400' : line.startsWith('⏳') || line.startsWith('🔄') ? 'text-yellow-400' : line.startsWith('[') && line.includes(']') ? 'text-cyan-400' : 'text-gray-300'}`}>
              {line}
            </div>
          ))}
          {/* Loading animation - only show during initial loading */}
          {isLoading && terminalOutput.length <= 6 && (
            <div className="flex items-center gap-2 text-yellow-400 mt-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-400 border-t-transparent"></div>
              <span className="text-sm">Executing code...</span>
            </div>
          )}
        </div>

        </div>
      </div>
    </>
  );
}
