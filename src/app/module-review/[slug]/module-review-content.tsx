"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { RichText } from "@/components/rich-text";
import CompletionIndicator from "@/components/CompletionIndicator";

interface ModuleReviewContentProps {
  review: any;
  slug: string;
}

export default function ModuleReviewContent({ review, slug }: ModuleReviewContentProps) {
  const { user } = useAuth();
  const [moduleSlug, setModuleSlug] = useState(''); // New state for moduleSlug

  useEffect(() => {
    // Get module slug from URL on client side
    if (typeof window !== 'undefined') {
      const urlModuleSlug = new URLSearchParams(window.location.search).get('module') || '';
      setModuleSlug(urlModuleSlug);
    }
  }, []); // Run once on client mount

  useEffect(() => {
    // Track this module review as viewed when the component mounts
    if (user && moduleSlug) {
        // Update viewed items in sessionStorage
        const viewedStorageKey = `viewedItems_${user.id}_${moduleSlug}`;
        const completedStorageKey = `completedItems_${user.id}_${moduleSlug}`;

        try {
          const viewedStored = sessionStorage.getItem(viewedStorageKey);
          const completedStored = sessionStorage.getItem(completedStorageKey);

          const viewedItems = viewedStored ? JSON.parse(viewedStored) : [];
          const completedItems = completedStored ? JSON.parse(completedStored) : [];

          // Add current timestamp for last viewed tracking
          const now = new Date().toISOString();

          // Update last viewed items (keep only recent 20 items)
          const lastViewedKey = `lastViewedItems_${user.id}_${moduleSlug}`;
          const lastViewedStored = sessionStorage.getItem(lastViewedKey);
          let lastViewedItems = lastViewedStored ? JSON.parse(lastViewedStored) : [];

          // Remove this item if it already exists, then add it to the front
          lastViewedItems = lastViewedItems.filter((item: any) => item.slug !== slug);
          lastViewedItems.unshift({
            slug,
            title: review.fields.topic || review.fields.title,
            type: 'moduleReview',
            course: moduleSlug,
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

          console.log(`[ModuleReviewContent] Marked module review ${slug} as viewed at ${now}`);
        } catch (error) {
          console.warn('[ModuleReviewContent] Failed to update viewed items:', error);
        }
    }
  }, [user, slug, review.fields.topic, review.fields.title, moduleSlug]); // Added moduleSlug to dependencies

  return (
    <div className="max-w-4xl mx-auto pb-[30vh]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{review.fields.topic || review.fields.title}</h1>
        <p className="text-gray-600 mb-2">Software Development Programme · Module Review</p>

        <CompletionIndicator type="moduleReview" slug={slug} module={moduleSlug} />
      </div>

      {review.fields.content && (
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <RichText document={review.fields.content} />
        </div>
      )}
    </div>
  );
}
