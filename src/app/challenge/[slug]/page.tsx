import { notFound } from "next/navigation";
import { getEntriesByContentType } from "@/lib/contentful";
import { RichText } from "@/components/rich-text";
import { StackBlitzToggle } from "@/components/stackblitz-toggle";

type Params = {
  params: Promise<{ slug: string }>;
};

export default async function ChallengePage({ params }: Params) {
  const { slug } = await params;
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

  const fields = challenge.fields as any;

  return (
    <div className="max-w-4xl mx-auto transition-transform duration-300 ease-in-out" id="main-content">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{fields.title}</h1>
        <p className="text-gray-600">Challenge · Software Development Programme</p>
      </div>

      {/* Preview Section */}
      {fields.preview && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Preview</h2>
          <div className="p-6 rounded-lg border border-gray-200 bg-gray-50">
            <RichText document={fields.preview} />
          </div>
        </section>
      )}

      {/* Content Section */}
      {fields.content && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Challenge Details</h2>
          <div className="p-6 rounded-lg border border-gray-200 bg-white">
            <RichText document={fields.content} />
          </div>
        </section>
      )}

      {/* Test Section */}
      {fields.test && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Test Requirements</h2>
          <div className="p-6 rounded-lg border border-yellow-200 bg-yellow-50">
            <RichText document={fields.test} />
          </div>
        </section>
      )}

      {/* Test Example Section */}
      {fields.testExample && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Test Example</h2>
          <div className="p-6 rounded-lg border border-blue-200 bg-blue-50">
            <RichText document={fields.testExample} />
          </div>
        </section>
      )}

      {/* StackBlitz Toggleable Code Editor */}
      {fields.fullCodeSolution && (
        <StackBlitzToggle 
          document={fields.fullCodeSolution} 
          className="mb-6"
        />
      )}

      {/* Full Code Solution Section */}
      {fields.fullCodeSolution && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Full Code Solution</h2>
          <div className="p-6 rounded-lg border border-green-200 bg-green-50">
            <RichText document={fields.fullCodeSolution} />
          </div>
        </section>
      )}
    </div>
  );
}
