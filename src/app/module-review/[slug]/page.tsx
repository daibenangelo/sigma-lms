import { notFound } from "next/navigation";
import { Metadata } from "next";
import ModuleReviewContent from "./module-review-content";

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
      ? `${baseUrl}/api/module-project?projectSlug=${slug}&module=${encodeURIComponent(moduleSlug)}`
      : `${baseUrl}/api/module-project?projectSlug=${slug}`;

    const response = await fetch(apiUrl, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.error || !data.project) {
      throw new Error(data.error || "Review not found");
    }

    const review = data.project;
    const topic = review.fields?.topic || "Module Review";

    return {
      title: `${topic} | Sigma LMS`,
      description: "Module review and summary content.",
      keywords: ["module review", "programming", "software development", "learning", topic.toLowerCase()],
      openGraph: {
        title: `${topic} | Sigma LMS`,
        description: "Module review and summary content.",
        type: "article",
      },
      twitter: {
        card: "summary",
        title: `${topic} | Sigma LMS`,
        description: "Module review and summary content.",
      },
    };
  } catch (error) {
    console.error("Error generating metadata for module review:", error);
    return {
      title: "Module Review | Sigma LMS",
      description: "Interactive programming module reviews and summaries.",
    };
  }
}

export default async function ModuleReviewPage({ params, searchParams }: { params: Promise<{ slug: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { slug } = await params;
  const search = await searchParams;
  const moduleSlug = typeof search.module === 'string' ? search.module : undefined;

  try {
    // For now, we'll still fetch directly from Contentful since we don't have a dedicated module-review API
    // In the future, we could create one similar to module-project
    const { getEntriesByContentType } = await import("@/lib/contentful");

    const reviews = await getEntriesByContentType<{
      topic?: string;
      slug?: string;
      content?: any;
    }>("moduleReview", { limit: 1, "fields.slug": slug, include: 10 });

    const review = reviews[0];
    if (!review) {
      notFound();
    }

    return <ModuleReviewContent review={review} slug={slug} moduleSlug={moduleSlug} />;
  } catch (error) {
    console.error("Error loading module review:", error);
    notFound();
  }
}
