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
      ? `${baseUrl}/api/module-review?reviewSlug=${encodeURIComponent(slug)}&module=${encodeURIComponent(moduleSlug)}`
      : `${baseUrl}/api/module-review?reviewSlug=${encodeURIComponent(slug)}`;

    const response = await fetch(apiUrl, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.error || !data.review) {
      throw new Error(data.error || "Review not found");
    }

    const review = data.review;
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
    // Fetch from our API route
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const apiUrl = moduleSlug
      ? `${baseUrl}/api/module-review?reviewSlug=${encodeURIComponent(slug)}&module=${encodeURIComponent(moduleSlug)}`
      : `${baseUrl}/api/module-review?reviewSlug=${encodeURIComponent(slug)}`;

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
      // Create a placeholder review for missing content
      const placeholderReview = {
        fields: {
          topic: 'Module Review',
          slug: slug,
          content: null
        }
      };
      return <ModuleReviewContent review={placeholderReview} slug={slug} />;
    }

    return <ModuleReviewContent review={data.review} slug={slug} />;

  } catch (error) {
    console.error("Error loading module review:", error);
    // Create a placeholder review for errors
    const placeholderReview = {
      fields: {
        topic: 'Module Review',
        slug: slug,
        content: null
      }
    };
    return <ModuleReviewContent review={placeholderReview} slug={slug} />;
  }
}
