"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  Circle,
  BookOpen,
  HelpCircle,
  Wrench,
  Swords
} from "lucide-react";

type ContentItem = {
  title: string;
  slug: string;
  type: 'lesson' | 'quiz' | 'module-quiz' | 'tutorial' | 'challenge';
};

export function CourseSidebar() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [courseName, setCourseName] = useState<string>("Course");
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [sidebarWidth, setSidebarWidth] = useState<number>(320);
  const isResizingRef = useRef<boolean>(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(320);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = e.clientX - startXRef.current;
      const next = Math.min(480, Math.max(240, startWidthRef.current + delta));
      setSidebarWidth(next);
    };
    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    // Load content list from API (filter to HTML course)
    fetch("/api/lessons?course=html")
      .then(async (r) => {
        const body = await r.json().catch(() => null);
        if (!r.ok) {
          console.error("[sidebar] /api/lessons error status:", r.status, body);
          return null;
        }
        return body;
      })
      .then((data) => {
        console.log("[sidebar] /api/lessons response:", data);
        if (!data) {
          setContent([]);
          return;
        }
        // Keep nested order: chapter followed by its items
        const combined = Array.isArray(data.allContent) ? data.allContent : [];
        console.log("[sidebar] combined content:", combined);
        setContent(combined);
        
        // Extract course name from the first lesson or use a default
        if (data.lessons && data.lessons.length > 0) {
          // Try to get course name from lesson metadata or use a default
          setCourseName("HTML Course");
        } else {
          setCourseName("Course");
        }
      })
      .catch((e) => {
        console.error("[sidebar] /api/lessons fetch failed:", e);
        setContent([]);
      });
  }, []);

  const startResizing = (e: React.MouseEvent<HTMLDivElement>) => {
    isResizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const toggleExpanded = () => {
    setIsExpanded(prev => !prev);
  };

  return (
    <div
      className="relative bg-white border-r border-gray-200 h-screen overflow-y-auto select-none"
      style={{ width: sidebarWidth }}
    >
          {/* Content List */}
          <div className="border-b border-gray-200">
            <Collapsible open={isExpanded} onOpenChange={toggleExpanded}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-4 h-auto hover:bg-gray-50 text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-lg text-gray-900">{courseName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {content.length} items
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-600" />
                    )}
                  </div>
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-4 pb-4">
                  {content.length > 0 ? (
                    <div className="space-y-1">
                      {content.map((item, index) => {
                        const isQuiz = item.type === 'quiz' || item.type === 'module-quiz';
                        const isTutorial = item.type === 'tutorial';
                        const isChallenge = item.type === 'challenge';
                        const href = isQuiz ? `/quiz/${item.slug}` : isTutorial ? `/tutorial/${item.slug}` : isChallenge ? `/challenge/${item.slug}` : `/chapter/${item.slug}`;
                        
                        return (
                          <Link
                            key={`${item.type}-${item.slug}`}
                            href={href}
                            className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
                          >
                            {isQuiz ? (
                              <HelpCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                            ) : isTutorial ? (
                              <Wrench className="h-4 w-4 text-purple-500 flex-shrink-0" />
                            ) : isChallenge ? (
                              <Swords className="h-4 w-4 text-rose-500 flex-shrink-0" />
                            ) : (
                              <Circle className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            )}
                            <Badge 
                              variant="outline" 
                              className={`text-xs px-2 py-1 ${
                                isQuiz 
                                  ? 'bg-orange-50 text-orange-700 border-orange-200' 
                                       : isTutorial
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                         : isChallenge
                                         ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-gray-50 text-gray-700 border-gray-200'
                              }`}
                            >
                              {index + 1}
                            </Badge>
                            <span className="text-sm text-gray-700 flex-1">
                              {item.title}
                            </span>
                            {isQuiz && (
                              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-600">
                                Quiz
                              </Badge>
                            )}
                            {isTutorial && (
                              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                                Tutorial
                              </Badge>
                            )}
                            {isChallenge && (
                              <Badge variant="secondary" className="text-xs bg-rose-100 text-rose-700">
                                Challenge
                              </Badge>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 p-2">No content found.</div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

      {/* Resize handle */}
      <div
        onMouseDown={startResizing}
        className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-gray-200 active:bg-gray-300"
      />
    </div>
  );
}
