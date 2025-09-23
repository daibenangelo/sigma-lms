import { NextResponse } from "next/server";
import { getEntriesByContentType } from "@/lib/contentful";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  try {
    const items = await getEntriesByContentType<{ title?: string; slug?: string; course?: string; program?: string; content?: any }>(
      "lesson",
      { limit: 1, "fields.slug": slug, include: 10 }
    );
    const lesson = items[0];
    if (!lesson) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    
    // Log the lesson content structure for debugging
    console.log("Lesson content structure:", JSON.stringify((lesson.fields as any).content, null, 2));
    
    return NextResponse.json({
      title: (lesson.fields as any).title || null,
      slug,
      course: (lesson.fields as any).course || null,
      program: (lesson.fields as any).program || null,
      content: (lesson.fields as any).content || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}


