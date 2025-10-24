import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getEntriesByContentType } from "@/lib/contentful";
import ModuleProjectContent from "./module-project-content";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;

  try {
    const projects = await getEntriesByContentType<{
      title?: string;
      slug?: string;
      content?: any;
      description?: string;
    }>("moduleProject", { limit: 1, "fields.slug": slug, include: 10 });

    const project = projects[0];

    const title = project ? (project.fields as any).title || "Module Project" : "Module Project";
    const description = project ? (project.fields as any).description || "Module project and hands-on coding assignment." : "Module project and hands-on coding assignment.";

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

export default async function ModuleProjectPage({ params }: Params) {
  const { slug } = await params;

  // Try to fetch the project from Contentful
  const projects = await getEntriesByContentType<{
    title?: string;
    slug?: string;
    content?: any;
    description?: string;
  }>("moduleProject", { limit: 1, "fields.slug": slug, include: 10 });

  const project = projects[0];

  // If project doesn't exist in Contentful, create a placeholder project
  const placeholderProject = project || {
    fields: {
      title: 'Module Project',
      slug: slug,
      description: 'This module project is not yet available in Contentful. It will be available once content is added.',
      content: null
    }
  };

  return <ModuleProjectContent project={placeholderProject} slug={slug} />;
}
