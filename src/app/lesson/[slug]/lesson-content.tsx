"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { RichText } from "@/components/rich-text";

interface LessonContentProps {
  lesson: any;
  slug: string;
}

export default function LessonContent({ lesson, slug }: LessonContentProps) {
  const { user } = useAuth();

  useEffect(() => {
    // Track this lesson as viewed when the component mounts
    if (user && typeof window !== 'undefined') {
      const courseSlug = new URLSearchParams(window.location.search).get('course');
      if (courseSlug) {
        // Update viewed items in sessionStorage
        const viewedStorageKey = `viewedItems_${user.id}_${courseSlug}`;
        const completedStorageKey = `completedItems_${user.id}_${courseSlug}`;

        try {
          const viewedStored = sessionStorage.getItem(viewedStorageKey);
          const completedStored = sessionStorage.getItem(completedStorageKey);

          const viewedItems = viewedStored ? JSON.parse(viewedStored) : [];
          const completedItems = completedStored ? JSON.parse(completedStored) : [];

          // Add current timestamp for last viewed tracking
          const now = new Date().toISOString();

          // Update last viewed items (keep only recent 20 items)
          const lastViewedKey = `lastViewedItems_${user.id}_${courseSlug}`;
          const lastViewedStored = sessionStorage.getItem(lastViewedKey);
          let lastViewedItems = lastViewedStored ? JSON.parse(lastViewedStored) : [];

          // Remove this item if it already exists, then add it to the front
          lastViewedItems = lastViewedItems.filter((item: any) => item.slug !== slug);
          lastViewedItems.unshift({
            slug,
            title: lesson.fields.title,
            type: 'lesson',
            course: courseSlug,
            viewedAt: now
          });

          // Keep only the 20 most recent items
          lastViewedItems = lastViewedItems.slice(0, 20);

          sessionStorage.setItem(lastViewedKey, JSON.stringify(lastViewedItems));

          // Also mark as viewed in the regular viewed items array
          if (!viewedItems.includes(slug)) {
            viewedItems.push(slug);
            sessionStorage.setItem(viewedStorageKey, JSON.stringify(viewedItems));
          }

          console.log(`[LessonContent] Marked lesson ${slug} as viewed at ${now}`);
        } catch (error) {
          console.warn('[LessonContent] Failed to update viewed items:', error);
        }
      }
    }
  }, [user, slug, lesson.fields.title]);

  return (
    <div className="max-w-4xl mx-auto pb-[30vh]">
      <h1 className="text-3xl font-bold mb-2">{lesson.fields.title}</h1>
      <p className="text-gray-600 mb-6">Software Development Programme · Module: Web Foundations</p>
      {lesson.fields.content && (
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <RichText document={lesson.fields.content} />
        </div>
      )}
    </div>
  );
}
