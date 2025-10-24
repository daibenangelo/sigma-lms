import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getEntriesByContentType } from "@/lib/contentful";
import { RichText } from "@/components/rich-text";
import TutorialContent from "./tutorial-content";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;

  try {
    const items = await getEntriesByContentType<{
      topic?: string;
      slug?: string;
      preview?: any;
      goal?: any;
      starterCode?: any;
      instructions?: any[];
      fullCodeSolution?: any;
    }>("lessonTutorial", { limit: 1, "fields.slug": slug, include: 10 });

    const tutorial = items[0];
    if (!tutorial) {
      return {
        title: "Tutorial Not Found | Sigma LMS",
        description: "The requested tutorial could not be found.",
      };
    }

    const title = (tutorial.fields as any).topic || "Tutorial";
    const preview = (tutorial.fields as any).preview;

    // Extract description from preview or goal
    let description = "Step-by-step programming tutorial with hands-on coding exercises.";
    if (preview && preview.content && preview.content.length > 0) {
      const firstParagraph = preview.content.find((node: any) => node.nodeType === 'paragraph');
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
      keywords: ["tutorial", "programming", "software development", "learning", "coding", title.toLowerCase()],
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
    console.error("Error generating metadata for tutorial:", error);
    return {
      title: "Tutorial | Sigma LMS",
      description: "Interactive programming tutorials and step-by-step guides.",
    };
  }
}

export default async function TutorialPage({ params }: Params) {
  const { slug } = await params;

  // Fetch Lesson Tutorial by slug (content type id: lessonTutorial)
  const items = await getEntriesByContentType<{
    topic?: string;
    slug?: string;
    preview?: any;
    goal?: any;
    starterCode?: any;
    instructions?: any[];
    fullCodeSolution?: any;
  }>("lessonTutorial", { limit: 1, "fields.slug": slug, include: 10 });

  const tutorial = items[0];
  if (!tutorial) {
    notFound();
  }

  const fields: any = tutorial.fields as any;
  const sectionPreview = fields.preview;
  const sectionGoal = fields.goal;
  const sectionInstructions: any[] = Array.isArray(fields.instructions) ? fields.instructions : [];
  const sectionSolution = fields.fullCodeSolution;

  return <TutorialContent tutorial={tutorial} slug={slug} />;
}
