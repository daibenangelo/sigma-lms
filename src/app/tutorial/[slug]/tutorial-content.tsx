"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { RichText } from "@/components/rich-text";
import { StackBlitzToggle } from "@/components/stackblitz-toggle";

interface TutorialContentProps {
  tutorial: any;
  slug: string;
}

export default function TutorialContent({ tutorial, slug }: TutorialContentProps) {
  const { user } = useAuth();
  const fields: any = tutorial.fields as any;
  const sectionPreview = fields.preview;
  const sectionGoal = fields.goal;
  const sectionInstructions: any[] = Array.isArray(fields.instructions) ? fields.instructions : [];
  const sectionSolution = fields.fullCodeSolution;

  useEffect(() => {
    // Track this tutorial as viewed when the component mounts
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
            title: fields.topic || fields.title,
            type: 'tutorial',
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

          console.log(`[TutorialContent] Marked tutorial ${slug} as viewed at ${now}`);
        } catch (error) {
          console.warn('[TutorialContent] Failed to update viewed items:', error);
        }
      }
    }
  }, [user, slug, fields.topic, fields.title]);

  return (
    <div className="max-w-4xl mx-auto pb-[30vh]">
      <h1 className="text-3xl font-bold mb-2">{fields.topic}</h1>
      <p className="text-gray-600 mb-6">Software Development Programme · Tutorial</p>
      {sectionPreview && (
        <div className="p-4 rounded-lg border border-gray-200 bg-white mb-6">
          <h2 className="text-lg font-semibold mb-2">Preview</h2>
          <RichText document={sectionPreview} />
        </div>
      )}

      {sectionGoal && (
        <div className="p-4 rounded-lg border border-gray-200 bg-white mb-6">
          <h2 className="text-lg font-semibold mb-2">Goal</h2>
          <RichText document={sectionGoal} />
        </div>
      )}

      {sectionInstructions.length > 0 && (
        <div className="p-4 rounded-lg border border-gray-200 bg-white mb-6">
          <h2 className="text-lg font-semibold mb-4">Instructions</h2>
          <div className="space-y-4">
            {sectionInstructions.map((inst: any, idx: number) => {
              const instDoc = inst?.fields?.content || inst?.fields?.body || inst?.fields?.instructions || inst?.fields?.step || inst?.fields?.richText;
              const instTitle = inst?.fields?.title || inst?.fields?.heading || `Step ${idx + 1}`;
              return (
                <div key={inst?.sys?.id || idx} className="border border-gray-200 rounded-md p-3">
                  <h3 className="font-medium mb-2">{instTitle}</h3>
                  {instDoc ? (
                    <RichText document={instDoc} />
                  ) : (
                    <p className="text-sm text-gray-600">No content for this step.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {sectionSolution && (
        <div className="p-4 rounded-lg border border-gray-200 bg-white mb-6">
          <h2 className="text-lg font-semibold mb-2">Full Code Solution</h2>
          <RichText document={sectionSolution} />
        </div>
      )}

      {/* Code Editor Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Code Editor</h2>
        <div className="p-6 rounded-lg border border-gray-200 bg-white">
          <p className="text-gray-600 mb-4">
            Use the code editor below to work on your tutorial. You can write, test, and debug your code here.
          </p>
          <StackBlitzToggle
            document={fields.starterCode || {
              nodeType: 'document',
              content: [{
                nodeType: 'paragraph',
                content: [{
                  nodeType: 'hyperlink',
                  data: {
                    uri: 'https://stackblitz.com/edit/react'
                  },
                  content: [{
                    nodeType: 'text',
                    value: 'Open StackBlitz Editor'
                  }]
                }]
              }]
            }}
          />
        </div>
      </section>
    </div>
  );
}
