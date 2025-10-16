import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getEntriesByContentType } from "@/lib/contentful";
import { RichText } from "@/components/rich-text";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;

  try {
    const items = await getEntriesByContentType<{
      title?: string;
      slug?: string;
      content?: any;
    }>("lesson", { limit: 1, "fields.slug": slug, include: 10 });

    const lesson = items[0];
    if (!lesson) {
      return {
        title: "Lesson Not Found | Sigma LMS",
        description: "The requested lesson could not be found.",
      };
    }

    const title = (lesson.fields as any).title || "Lesson";
    const content = (lesson.fields as any).content;

    // Extract description from content (first paragraph or preview text)
    let description = "Learn software development concepts and programming fundamentals.";
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
      title: `${title} | Sigma LMS`,
      description,
      keywords: ["lesson", "programming", "software development", "learning", title.toLowerCase()],
      openGraph: {
        title: `${title} | Sigma LMS`,
        description,
        type: "article",
      },
      twitter: {
        card: "summary",
        title: `${title} | Sigma LMS`,
        description,
      },
    };
  } catch (error) {
    console.error("Error generating metadata for lesson:", error);
    return {
      title: "Lesson | Sigma LMS",
      description: "Interactive programming lessons and tutorials.",
    };
  }
}

export default async function LessonPage({ params }: Params) {
  const { slug } = await params;
  const items = await getEntriesByContentType<{
    title?: string;
    slug?: string;
    content?: any;
  }>("lesson", { limit: 1, "fields.slug": slug, include: 10 });

  const lesson = items[0];
  if (!lesson) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto pb-[30vh]">
      <h1 className="text-3xl font-bold mb-2">{(lesson.fields as any).title}</h1>
      <p className="text-gray-600 mb-6">Software Development Programme · Module: Web Foundations</p>
      {(lesson.fields as any).content && (
        <div className="p-4 rounded-lg border border-gray-200 bg-white">
          <RichText document={(lesson.fields as any).content} />
        </div>
      )}
    </div>
  );
}


