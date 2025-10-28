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

// Helper function to generate error hints based on error type and message
const getErrorHint = (errorName: string, errorMessage: string): string => {
  const hints: Record<string, (msg: string) => string> = {
    SyntaxError: (msg) => {
      if (msg.includes('Unexpected token')) return '💡 Hint: Check for missing or extra brackets, parentheses, or semicolons.';
      if (msg.includes('Unexpected identifier')) return '💡 Hint: You might have a typo in a variable name or missing a comma/semicolon.';
      if (msg.includes('Unexpected end of input')) return '💡 Hint: You might be missing a closing bracket, brace, or parenthesis.';
      if (msg.includes('Invalid or unexpected token')) return '💡 Hint: Check for invalid characters or incorrect syntax.';
      return '💡 Hint: Review your code syntax. Look for typos, missing punctuation, or incorrect structure.';
    },
    ReferenceError: (msg) => {
      if (msg.includes('is not defined')) return '💡 Hint: Make sure the variable or function is declared before using it.';
      return '💡 Hint: You\'re trying to use something that doesn\'t exist. Check your variable and function names.';
    },
    TypeError: (msg) => {
      if (msg.includes('is not a function')) return '💡 Hint: You\'re trying to call something that isn\'t a function. Check your code logic.';
      if (msg.includes('Cannot read property')) return '💡 Hint: You\'re trying to access a property of null or undefined. Add a check before accessing.';
      if (msg.includes('Cannot set property')) return '💡 Hint: You\'re trying to set a property on something that doesn\'t support it.';
      return '💡 Hint: You\'re using a value in a way that\'s not compatible with its type.';
    },
    RangeError: () => '💡 Hint: A value is not in the expected range. Check array indices or numeric values.',
    URIError: () => '💡 Hint: There\'s an issue with encoding or decoding a URI. Check your URL formatting.',
    EvalError: () => '💡 Hint: There\'s an issue with the eval() function usage.',
  };

  const hintGenerator = hints[errorName];
  return hintGenerator ? hintGenerator(errorMessage) : '💡 Hint: Review your code for potential issues. Check the error details below.';
};

// Helper function to extract file name and line number from stack trace
const parseErrorLocation = (stack: string): { fileName: string; lineNumber: string } => {
  if (!stack) return { fileName: 'script.js', lineNumber: 'unknown' };
  
  // Try to find line number in stack trace
  const lineMatch = stack.match(/:(\d+):\d+/);
  const lineNumber = lineMatch ? lineMatch[1] : 'unknown';
  
  // For Code Runner, we're always executing script.js
  return { fileName: 'script.js', lineNumber };
};

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
                console.error('SCRIPT_ERROR:', JSON.stringify({
                  name: e.name,
                  message: e.message,
                  stack: e.stack,
                  lineNumber: e.lineNumber,
                  columnNumber: e.columnNumber
                }));
              }
            `);

            // Execute the script - this will use our overridden console methods
            executeScript();

            // Set the captured logs
            setConsoleLogs(capturedLogs);


          } catch (error) {
            console.error('SCRIPT_ERROR:', JSON.stringify({
              name: error instanceof Error ? error.name : 'Error',
              message: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : '',
              lineNumber: null,
              columnNumber: null
            }));
            setConsoleLogs(prev => [...prev, `[ERROR] SCRIPT_ERROR: ${JSON.stringify({
              name: error instanceof Error ? error.name : 'Error',
              message: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : '',
              lineNumber: null,
              columnNumber: null
            })}`]);
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

          // Check if there are any errors in the logs
          const errorLogs = filteredLogs.filter(log => log.includes('SCRIPT_ERROR:'));
          
          if (errorLogs.length > 0) {
            // Parse and display error in user-friendly format
            const errorLog = errorLogs[0];
            try {
              const errorJsonMatch = errorLog.match(/SCRIPT_ERROR:\s*({.*})/);
              if (errorJsonMatch) {
                const errorData = JSON.parse(errorJsonMatch[1]);
                const { name, message, stack } = errorData;
                const { fileName, lineNumber } = parseErrorLocation(stack);
                const hint = getErrorHint(name, message);
                
                // Format the stack trace for display
                const stackLines = stack ? stack.split('\n').slice(0, 5) : []; // Show first 5 lines of stack
                
                setTerminalOutput([
                  '❌ Error Detected',
                  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
                  '',
                  `🔴 ${name}: ${message}`,
                  `📄 File: ${fileName} (Line ${lineNumber})`,
                  '',
                  hint,
                  '',
                  '📚 Full Error Stack:',
                  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
                  ...stackLines,
                  '',
                ]);
                return;
              }
            } catch (parseError) {
              console.warn('Failed to parse error JSON:', parseError);
            }
          }

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
