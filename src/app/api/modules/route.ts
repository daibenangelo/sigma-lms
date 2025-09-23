import { NextResponse } from "next/server";
import { getEntriesByContentType } from "@/lib/contentful";

export async function GET() {
  try {
    // Fetch modules from Contentful
    const moduleItems = await getEntriesByContentType<{ 
      title?: string; 
      slug?: string; 
      moduleReview?: any;
      moduleQuiz?: any[];
      moduleProject?: any[];
    }>(
      "module",
      { limit: 1000, include: 10 }
    );

    const modules = moduleItems
      .map((item: any) => ({
        id: item.sys?.id,
        title: item.fields?.title,
        slug: item.fields?.slug,
        moduleReview: item.fields?.moduleReview,
        moduleQuiz: item.fields?.moduleQuiz || [],
        moduleProject: item.fields?.moduleProject || [],
        // Calculate total steps (lessons + quizzes + projects)
        totalSteps: 0, // Will be calculated based on linked content
        completedSteps: 0, // Placeholder for now
        description: `Learn ${item.fields?.title || 'Module'} fundamentals`
      }))
      .filter((m) => m.title && m.slug);

    return NextResponse.json({ modules });
  } catch (e: any) {
    console.error("[api/modules] Error:", e);
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
