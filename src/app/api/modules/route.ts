import { NextResponse } from "next/server";
import { getEntriesByContentType } from "@/lib/contentful";

export async function GET() {
  try {
    console.log("[api/modules] Fetching modules...");
    
    // Try different content types that might represent modules/courses
    const contentTypes = ["course", "module", "program"];
    let modules: any[] = [];
    
    for (const contentType of contentTypes) {
      try {
        console.log(`[api/modules] Trying content type: ${contentType}`);
        const items = await getEntriesByContentType<{ 
          title?: string; 
          slug?: string; 
          description?: string;
        }>(contentType, { limit: 1000, include: 10 });
        
        console.log(`[api/modules] Found ${items.length} items for ${contentType}`);
        
        const mappedItems = items
          .map((item: any) => ({
            id: item.sys?.id,
            title: item.fields?.title,
            slug: item.fields?.slug,
            description: item.fields?.description || `Learn ${item.fields?.title || 'Module'} fundamentals`,
            totalSteps: 0, // Will be calculated based on linked content
            completedSteps: 0, // Placeholder for now
          }))
          .filter((m) => m.title && m.slug);
        
        modules = [...modules, ...mappedItems];
      } catch (e) {
        console.log(`[api/modules] Content type ${contentType} not found or error:`, e);
        continue;
      }
    }
    
    // If no modules found, create a default HTML module
    if (modules.length === 0) {
      console.log("[api/modules] No modules found, creating default HTML module");
      modules = [{
        id: "html-module",
        title: "HTML Module",
        slug: "html",
        description: "Learn HTML fundamentals",
        totalSteps: 0,
        completedSteps: 0,
      }];
    }

    console.log(`[api/modules] Returning ${modules.length} modules`);
    return NextResponse.json({ modules });
  } catch (e: any) {
    console.error("[api/modules] Error:", e);
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
