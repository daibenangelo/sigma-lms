import { NextResponse } from "next/server";
import { getEntriesByContentType } from "@/lib/contentful";

export async function GET() {
  try {
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

    return NextResponse.json({ quizzes });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
