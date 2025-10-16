import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getEntriesByContentType } from "@/lib/contentful";
import { RichText } from "@/components/rich-text";

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

  return (
    <div className="max-w-4xl mx-auto pb-[30vh]">
      <h1 className="text-3xl font-bold mb-2">{fields.topic}</h1>
      <p className="text-gray-600 mb-6">Software Development Programme · Tutorial</p>
      {sectionPreview && (
        <div className="p-4 rounded-lg border border-gray-200 bg-white mb-6">
          <h2 className="text-lg font-semibold mb-2">Preview</h2>
          <RichText document={sectionPreview} />
        </div>
      )}

      {sectionGoal && (
        <div className="p-4 rounded-lg border border-gray-200 bg-white mb-6">
          <h2 className="text-lg font-semibold mb-2">Goal</h2>
          <RichText document={sectionGoal} />
        </div>
      )}

      {sectionInstructions.length > 0 && (
        <div className="p-4 rounded-lg border border-gray-200 bg-white mb-6">
          <h2 className="text-lg font-semibold mb-4">Instructions</h2>
          <div className="space-y-4">
            {sectionInstructions.map((inst: any, idx: number) => {
              const instDoc = inst?.fields?.content || inst?.fields?.body || inst?.fields?.instructions || inst?.fields?.step || inst?.fields?.richText;
              const instTitle = inst?.fields?.title || inst?.fields?.heading || `Step ${idx + 1}`;
              return (
                <div key={inst?.sys?.id || idx} className="border border-gray-200 rounded-md p-3">
                  <h3 className="font-medium mb-2">{instTitle}</h3>
                  {instDoc ? (
                    <RichText document={instDoc} />
                  ) : (
                    <p className="text-sm text-gray-600">No content for this step.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {sectionSolution && (
        <div className="p-4 rounded-lg border border-gray-200 bg-white mb-6">
          <h2 className="text-lg font-semibold mb-2">Full Code Solution</h2>
          <RichText document={sectionSolution} />
        </div>
      )}
    </div>
  );
}
