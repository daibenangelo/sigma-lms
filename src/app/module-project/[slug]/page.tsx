import { notFound } from "next/navigation";
import { Metadata } from "next";
import ModuleProjectContent from "./module-project-content";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }): Promise<Metadata> {
  const { slug } = await params;
  const search = await searchParams;
  const moduleSlug = typeof search.module === 'string' ? search.module : undefined;

  try {
    // Fetch from our API route
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const apiUrl = moduleSlug
      ? `${baseUrl}/api/module-project?projectSlug=${encodeURIComponent(slug)}&module=${encodeURIComponent(moduleSlug)}`
      : `${baseUrl}/api/module-project?projectSlug=${encodeURIComponent(slug)}`;

    const response = await fetch(apiUrl, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.error || !data.project) {
      throw new Error(data.error || "Project not found");
    }

    const project = data.project;
    const title = project.fields?.title || "Module Project";
    const description = "Module project and hands-on coding assignment.";

    return {
      title: `${title} | Sigma LMS`,
      description,
      keywords: ["module project", "programming", "software development", "learning", "assignment", title.toLowerCase()],
      openGraph: {
        title: `${title} | Sigma LMS`,
        description,
        type: "website",
      },
      twitter: {
        card: "summary",
        title: `${title} | Sigma LMS`,
        description,
      },
    };
  } catch (error) {
    console.error("Error generating metadata for module project:", error);
    return {
      title: "Module Project | Sigma LMS",
      description: "Interactive programming module projects and assignments.",
    };
  }
}

export default async function ModuleProjectPage({ params, searchParams }: { params: Promise<{ slug: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { slug } = await params;
  const search = await searchParams;
  const moduleSlug = typeof search.module === 'string' ? search.module : undefined;

  try {
    // Fetch from our API route
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const apiUrl = moduleSlug
      ? `${baseUrl}/api/module-project?projectSlug=${encodeURIComponent(slug)}&module=${encodeURIComponent(moduleSlug)}`
      : `${baseUrl}/api/module-project?projectSlug=${encodeURIComponent(slug)}`;

    const response = await fetch(apiUrl, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      console.error("API error:", data.error);
      // Create a placeholder project for missing content
      const placeholderProject = {
        fields: {
          title: 'Module Project',
          slug: slug,
          description: 'This module project is not yet available. It will be available once content is added.',
          preview: null,
          goal: null,
          requirements: null
        }
      };
      return <ModuleProjectContent project={placeholderProject} slug={slug} />;
    }

    return <ModuleProjectContent project={data.project} slug={slug} />;

  } catch (error) {
    console.error("Error loading module project:", error);
    // Create a placeholder project for errors
    const placeholderProject = {
      fields: {
        title: 'Module Project',
        slug: slug,
        description: 'This module project is currently unavailable. Please try again later.',
        preview: null,
        goal: null,
        requirements: null
      }
    };
    return <ModuleProjectContent project={placeholderProject} slug={slug} />;
  }
}
