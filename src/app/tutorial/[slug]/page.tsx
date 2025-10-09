import { notFound } from "next/navigation";
import { getEntriesByContentType } from "@/lib/contentful";
import { RichText } from "@/components/rich-text";
import { StackBlitzToggle } from "@/components/stackblitz-toggle";

interface Params {
  params: Promise<{ slug: string }>;
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
  const sectionStarter = fields.starterCode;
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

      {sectionStarter && (
        <div className="p-4 rounded-lg border border-gray-200 bg-white mb-6">
          <h2 className="text-lg font-semibold mb-2">Starter Code</h2>
          <RichText document={sectionStarter} />
        </div>
      )}

      {/* Code Editor - Same as Challenges */}
      <StackBlitzToggle 
        document={sectionStarter} 
      />

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
