import { NextResponse } from "next/server";
import { getEntriesByContentType } from "@/lib/contentful";
import { unstable_cache } from 'next/cache';

// Cached function to get quizzes
const getCachedQuizzes = unstable_cache(
  async () => {
    console.log("[api/quizzes] Cached fetch for quizzes...");

    // Fetch quizzes directly
    const quizItems = await getEntriesByContentType<{ title?: string; slug?: string }>(
      "quiz",
      { limit: 1000, include: 10 }
    );

    // Fetch modules that contain quiz data
    const moduleItems = await getEntriesByContentType<{ title?: string; slug?: string; quiz?: any }>(
      "module",
      { limit: 1000, include: 10 }
    );

    const quizzes: any[] = [];

    // Add direct quizzes
    quizItems.forEach((item: any) => {
      if (item.fields?.title && item.fields?.slug) {
        quizzes.push({
          title: item.fields.title,
          slug: item.fields.slug,
          type: 'quiz'
        });
      }
    });

    // Add modules with quiz data
    moduleItems.forEach((item: any) => {
      if (item.fields?.title && item.fields?.slug && item.fields?.quiz) {
        quizzes.push({
          title: `${item.fields.title} Quiz`,
          slug: item.fields.slug,
          type: 'module-quiz'
        });
      }
    });

    console.log(`[api/quizzes] Returning ${quizzes.length} quizzes`);
    return { quizzes };
  },
  ['quizzes'],
  {
    tags: ['quizzes'],
    revalidate: 1800 // 30 minutes
  }
);

export async function GET() {
  try {
    const result = await getCachedQuizzes();
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[api/quizzes] Error:", e);
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
