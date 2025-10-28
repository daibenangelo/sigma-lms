import { NextResponse } from "next/server";
import { getEntriesByContentType } from "@/lib/contentful";

// Function to get module review by slug and module
async function getModuleReview(reviewSlug: string, moduleSlug?: string) {
  try {
    console.log(`[module-review API] Looking for review: ${reviewSlug}, module: ${moduleSlug}`);

    // If moduleSlug is provided, find the review through the module
    if (moduleSlug) {
      console.log(`[module-review API] Fetching module ${moduleSlug} first`);

      const modules = await getEntriesByContentType<{
        title?: string;
        slug?: string;
        moduleReview?: any;
      }>(
        "module",
        { limit: 1, "fields.slug": moduleSlug, include: 10 }
      );

      if (modules.length === 0) {
        console.log(`[module-review API] Module ${moduleSlug} not found`);
        return { error: "Module not found", review: null };
      }

      const module = modules[0];
      const moduleReview = module.fields?.moduleReview;

      console.log(`[module-review API] Module has moduleReview:`, !!moduleReview);

      if (moduleReview && moduleReview.fields?.slug === reviewSlug) {
        console.log(`[module-review API] Found linked review: ${moduleReview.fields?.title}`);
        return {
          review: moduleReview,
          moduleTitle: module.fields?.title || 'Module'
        };
      }

      console.log(`[module-review API] Review ${reviewSlug} not found in module ${moduleSlug}`);
      return { error: "Review not found in module", review: null };
    }

    // Fallback: try to fetch review directly by slug
    console.log(`[module-review API] Fallback: fetching review directly by slug`);
    const reviews = await getEntriesByContentType<{
      topic?: string;
      slug?: string;
      content?: any;
    }>(
      "moduleReview",
      { limit: 1, "fields.slug": reviewSlug, include: 10 }
    );

    if (reviews.length > 0) {
      console.log(`[module-review API] Found review directly: ${reviews[0].fields?.topic}`);
      return { review: reviews[0], moduleTitle: 'Module' };
    }

    console.log(`[module-review API] Review ${reviewSlug} not found anywhere`);
    return { error: "Review not found", review: null };

  } catch (error) {
    console.error(`[module-review API] Error fetching module review:`, error);
    return { error: "Failed to fetch module review", review: null };
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reviewSlug = searchParams.get('reviewSlug');
    const moduleSlug = searchParams.get('module');

    console.log(`[module-review API] Received request for review: ${reviewSlug}, module: ${moduleSlug}`);

    if (!reviewSlug) {
      return NextResponse.json(
        { error: "Review slug is required" },
        { status: 400 }
      );
    }

    const result = await getModuleReview(reviewSlug, moduleSlug);

    if (result.error) {
      return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error("[module-review API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch module review" },
      { status: 500 }
    );
  }
}
