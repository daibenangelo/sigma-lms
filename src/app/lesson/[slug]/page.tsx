import { notFound } from "next/navigation";
import { getEntriesByContentType } from "@/lib/contentful";
import { RichText } from "@/components/rich-text";

type Params = {
  params: Promise<{ slug: string }>;
};

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
    <div className="max-w-4xl mx-auto">
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


