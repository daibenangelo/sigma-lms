import { notFound } from "next/navigation";
import { getEntriesByContentType } from "@/lib/contentful";
import { RichText } from "@/components/rich-text";

type Params = {
  params: Promise<{ slug: string }>;
};

export default async function ChallengePage({ params }: Params) {
  const { slug } = await params;

  // Fetch Chapter Challenge by slug (content type id: lessonChallenge)
  const items = await getEntriesByContentType<{
    title?: string;
    slug?: string;
    preview?: any;
    content?: any;
    test?: any;
    testExample?: any;
    fullCodeSolution?: any;
  }>("lessonChallenge", { limit: 1, "fields.slug": slug, include: 10 });

  const challenge = items[0];
  if (!challenge) {
    notFound();
  }

  const fields: any = challenge.fields as any;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{fields.title}</h1>
      <p className="text-gray-600 mb-6">Software Development Programme · Challenge</p>

      {fields.preview && (
        <div className="p-4 rounded-lg border border-gray-200 bg-white mb-6">
          <h2 className="text-lg font-semibold mb-2">Preview</h2>
          <RichText document={fields.preview} />
        </div>
      )}

      {fields.content && (
        <div className="p-4 rounded-lg border border-gray-200 bg-white mb-6">
          <h2 className="text-lg font-semibold mb-2">Content</h2>
          <RichText document={fields.content} />
        </div>
      )}

      {fields.test && (
        <div className="p-4 rounded-lg border border-gray-200 bg-white mb-6">
          <h2 className="text-lg font-semibold mb-2">Test</h2>
          <RichText document={fields.test} />
        </div>
      )}

      {fields.testExample && (
        <div className="p-4 rounded-lg border border-gray-200 bg-white mb-6">
          <h2 className="text-lg font-semibold mb-2">Test Example</h2>
          <RichText document={fields.testExample} />
        </div>
      )}

      {fields.fullCodeSolution && (
        <div className="p-4 rounded-lg border border-gray-200 bg-white mb-6">
          <h2 className="text-lg font-semibold mb-2">Full Code Solution</h2>
          <RichText document={fields.fullCodeSolution} />
        </div>
      )}
    </div>
  );
}


