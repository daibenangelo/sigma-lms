"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { RichText } from "@/components/rich-text";
import CompletionIndicator from "@/components/CompletionIndicator";

interface ModuleProjectContentProps {
  project: {
    fields: {
      title?: string;
      slug?: string;
      content?: any;
      description?: string;
    };
  };
  slug: string;
}

export default function ModuleProjectContent({ project, slug }: ModuleProjectContentProps) {
  const { user } = useAuth();

  useEffect(() => {
    // Track this module project as viewed when the component mounts
    if (user && typeof window !== 'undefined') {
      const moduleSlug = new URLSearchParams(window.location.search).get('module') || '';

      // Update viewed items in sessionStorage
      const viewedStorageKey = `viewedItems_${user.id}_${moduleSlug}`;

      try {
        const viewedStored = sessionStorage.getItem(viewedStorageKey);
        const viewedItems = viewedStored ? JSON.parse(viewedStored) : [];

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
          title: project.fields.title || 'Module Project',
          type: 'moduleProject',
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

        console.log(`[ModuleProjectContent] Marked module project ${slug} as viewed at ${now}`);
      } catch (error) {
        console.warn('[ModuleProjectContent] Failed to update viewed items:', error);
      }
    }
  }, [user, slug, project.fields.title]);

  return (
    <div className="max-w-4xl mx-auto pb-[30vh]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{project.fields.title || 'Module Project'}</h1>
        <p className="text-gray-600 mb-2">Software Development Programme · Module Project</p>
        {project.fields.description && (
          <p className="text-gray-600 mb-4">{project.fields.description}</p>
        )}

        <CompletionIndicator type="moduleProject" slug={slug} module={new URLSearchParams(window.location.search).get('module') || ''} />
      </div>

      {project.fields.content ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <RichText document={project.fields.content} />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-center py-12">
            <div className="text-gray-500">
              <p>{project.fields.description || 'Project content will be available soon.'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
