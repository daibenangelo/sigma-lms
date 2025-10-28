"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { RichText } from "@/components/rich-text";
import { StackBlitzToggle } from "@/components/stackblitz-toggle";
import CompletionIndicator from "@/components/CompletionIndicator";

interface ChallengeContentProps {
  challenge: any;
  slug: string;
}

export default function ChallengeContent({ challenge, slug }: ChallengeContentProps) {
  const { user } = useAuth();
  const fields: any = challenge.fields;
  const testJS = fields.testJS;

  useEffect(() => {
    // Track this challenge as viewed when the component mounts
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
            title: fields.title,
            type: 'challenge',
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

          console.log(`[ChallengeContent] Marked challenge ${slug} as viewed at ${now}`);
        } catch (error) {
          console.warn('[ChallengeContent] Failed to update viewed items:', error);
        }
      }
    }
  }, [user, slug, fields.title]);

  return (
    <div className="max-w-4xl mx-auto pb-[30vh]">
      <h1 className="text-3xl font-bold mb-2">{fields.title}</h1>
      <p className="text-gray-600 mb-2">Software Development Programme · Challenge</p>
      <CompletionIndicator type="challenge" slug={slug} />

      {/* Preview Section */}
      {fields.preview && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Preview</h2>
          <div className="p-6 rounded-lg border border-blue-200 bg-blue-50">
            <RichText document={fields.preview} />
          </div>
        </section>
      )}

      {/* Content Section */}
      {fields.content && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Instructions</h2>
          <div className="p-6 rounded-lg border border-gray-200 bg-white">
            <RichText document={fields.content} />
          </div>
        </section>
      )}

      {/* Code Editor Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Code Editor</h2>
        <div className="p-6 rounded-lg border border-gray-200 bg-white">
          <p className="text-gray-600 mb-4">
            Use the code editor below to work on your challenge. You can write, test, and debug your code here.
          </p>
          <StackBlitzToggle
            document={fields.starterCode || {
              nodeType: 'document',
              content: [{
                nodeType: 'paragraph',
                content: [{
                  nodeType: 'text',
                  value: 'https://stackblitz.com/edit/web-platform-example'
                }]
              }]
            }}
            testJS={testJS}
          />
        </div>
      </section>
    </div>
  );
}
