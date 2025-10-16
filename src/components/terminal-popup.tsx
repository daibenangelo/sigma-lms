"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Copy, Play, Terminal, Code, Move } from "lucide-react";

interface TerminalPopupProps {
  isOpen: boolean;
  onClose: () => void;
  scriptContent: string;
  projectId: string;
}

export function TerminalPopup({ isOpen, onClose, scriptContent, projectId }: TerminalPopupProps) {
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isLoading, setIsLoading] = useState(false);
  const [executionCount, setExecutionCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
          console.log('[Terminal] Executing script on terminal open');

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

            console.log('[Terminal] Script execution completed');
            console.log('[Terminal] Captured logs count:', capturedLogs.length);
            console.log('[Terminal] First few captured logs:', capturedLogs.slice(0, 3));

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
          console.log('[Terminal] Display useEffect - consoleLogs:', consoleLogs);
          console.log('[Terminal] Display useEffect - consoleLogs length:', consoleLogs.length);

          const filteredLogs = consoleLogs.filter(log => !log.includes('[Terminal]'));
          console.log('[Terminal] Display useEffect - filtered logs:', filteredLogs);
          console.log('[Terminal] Display useEffect - script content length:', scriptContent.length);

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
        '💡 Write some code in the editor and click "Run" to see it here.',
        '',
        'Commands: help, clear'
      ]);
    }
  }, [isOpen, scriptContent, consoleLogs, executionCount]);

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentCommand.trim()) return;

    // Add command to history
    setCommandHistory(prev => [...prev, currentCommand]);
    setHistoryIndex(-1);

    // Process command
    let output = '';
    const cmd = currentCommand.trim().toLowerCase();

    if (cmd === 'node script.js') {
      output = `> ${currentCommand}\n\n✅ Running your code...\n\n` +
               `Your code is running! Check the console for any output.\n` +
               `💡 To run this in StackBlitz: Click the terminal tab below and type:\n` +
               `   node script.js\n\n`;
    } else if (cmd === 'npm run dev') {
      output = `> ${currentCommand}\n\n🚀 Starting development server...\n\n` +
               `Your development server would start here.\n` +
               `Check the actual terminal for real output.\n\n`;
    } else if (cmd === 'help' || cmd === '?') {
      output = `> ${currentCommand}\n\n` +
               `Available commands:\n` +
               `• node script.js     - Run your JavaScript code\n` +
               `• npm run dev       - Start development server\n` +
               `• clear             - Clear this window\n` +
               `• help              - Show this help\n\n` +
               `💡 This shows your code. To run it for real:\n` +
               `   1. Click the terminal tab at the bottom\n` +
               `   2. Type: node script.js\n\n`;
    } else if (cmd === 'clear') {
      setTerminalOutput(['Code Runner cleared.\n']);
      setConsoleLogs([]);
      setCurrentCommand('');
      return;
    } else {
      output = `> ${currentCommand}\n\n` +
               `❓ Command not recognized.\n` +
               `Type 'help' for available commands.\n\n`;
    }

    setTerminalOutput(prev => [...prev, output]);
    setCurrentCommand('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentCommand('');
      }
    }
  };

  const copyScript = () => {
    navigator.clipboard.writeText(scriptContent);
    setTerminalOutput(prev => [...prev, '📋 script.js content copied to clipboard!\n']);
  };

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
              onClick={copyScript}
              size="sm"
              variant="outline"
              className="text-gray-300 border-gray-600 hover:bg-gray-800"
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy Code
            </Button>
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

        {/* Command Input */}
        <form onSubmit={handleCommandSubmit} className="p-4 border-t border-gray-700" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <span className="text-green-400 font-mono">$</span>
            <textarea
              ref={textareaRef}
              value={currentCommand}
              onChange={(e) => setCurrentCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-none outline-none text-gray-100 font-mono text-sm resize-none"
              placeholder="Type commands here..."
              rows={1}
              style={{ minHeight: '20px' }}
            />
            <Button
              type="submit"
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={!currentCommand.trim()}
            >
              <Play className="h-3 w-3 mr-1" />
              Run
            </Button>
          </div>
        </form>
        </div>
      </div>
    </>
  );
}
