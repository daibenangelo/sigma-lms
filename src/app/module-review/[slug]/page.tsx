import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getEntriesByContentType } from "@/lib/contentful";
import ModuleReviewContent from "./module-review-content";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }): Promise<Metadata> {
  const { slug } = await params;

  try {
    const reviews = await getEntriesByContentType<{
      topic?: string;
      slug?: string;
      content?: any;
    }>("moduleReview", { limit: 1, "fields.slug": slug, include: 10 });

    const review = reviews[0];
    if (!review) {
      return {
        title: "Module Review Not Found | Sigma LMS",
        description: "The requested module review could not be found.",
      };
    }

    const topic = (review.fields as any).topic || "Module Review";
    const content = (review.fields as any).content;

    // Extract description from content (first paragraph or preview text)
    let description = "Module review and summary content.";
    if (content && content.content && content.content.length > 0) {
      const firstParagraph = content.content.find((node: any) => node.nodeType === 'paragraph');
      if (firstParagraph && firstParagraph.content) {
        const textContent = firstParagraph.content
          .filter((node: any) => node.nodeType === 'text')
          .map((node: any) => node.value)
          .join(' ');
        if (textContent.length > 50) {
          description = textContent.substring(0, 150) + "...";
        } else {
          description = textContent;
        }
      }
    }

    return {
      title: `${topic} | Sigma LMS`,
      description,
      keywords: ["module review", "programming", "software development", "learning", topic.toLowerCase()],
      openGraph: {
        title: `${topic} | Sigma LMS`,
        description,
        type: "article",
      },
      twitter: {
        card: "summary",
        title: `${topic} | Sigma LMS`,
        description,
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
  const reviews = await getEntriesByContentType<{
    topic?: string;
    slug?: string;
    content?: any;
  }>("moduleReview", { limit: 1, "fields.slug": slug, include: 10 });

  const review = reviews[0];
  if (!review) {
    notFound();
  }

  return <ModuleReviewContent review={review} slug={slug} />;
}
