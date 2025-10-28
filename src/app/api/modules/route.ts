import { NextResponse } from "next/server";
import { getEntriesByContentType } from "@/lib/contentful";


// Function to get all modules (simplified)
async function getModules() {
  const modules = await getEntriesByContentType<{
    title?: string;
    slug?: string;
    courses?: any[];
    moduleQuiz?: any[];
    moduleProject?: any[];
    moduleReview?: any;
  }>("module", { include: 3 });

  // Sort modules by creation date (oldest first)
  const sortedModules = modules.sort((a, b) => {
    const dateA = new Date(a.sys.createdAt);
    const dateB = new Date(b.sys.createdAt);
    return dateA.getTime() - dateB.getTime();
  });

  // Transform the data (simplified)
  const transformedModules = sortedModules.map((module) => {
    const moduleSlug = module.fields.slug;
    if (!moduleSlug || typeof moduleSlug !== 'string') {
      return {
        id: module.sys.id,
        title: module.fields.title || 'Untitled Module',
        slug: moduleSlug || '',
          courses: Array.isArray(module.fields?.courses) ? module.fields.courses.map((course: any) => ({
            id: course.sys?.id || '',
            title: course.fields?.title || 'Untitled Course',
            slug: course.fields?.slug || '',
            chapters: course.fields?.chapters || [],
            quizCount: 0,
            tutorialCount: 0,
            challengeCount: 0,
            progressPercentage: 0,
          })) : [],
        moduleQuiz: [{
          sys: { id: `module-quiz-${module.sys.id}` },
          fields: {
            title: 'Module Quiz',
            slug: moduleSlug || module.sys.id
          }
        }],
        moduleProject: module.fields?.moduleProject || [],
        moduleReview: module.fields?.moduleReview || null,
      };
    }

    return {
      id: module.sys.id,
      title: module.fields.title || 'Untitled Module',
      slug: moduleSlug,
      courses: Array.isArray(module.fields?.courses) ? module.fields.courses.map((course: any) => ({
        id: course.sys?.id || '',
        title: course.fields?.title || 'Untitled Course',
        slug: course.fields?.slug || '',
        chapters: course.fields?.chapters || [],
        quizCount: 0,
        tutorialCount: 0,
        challengeCount: 0,
        progressPercentage: 0,
      })) : [],
      moduleQuiz: (Array.isArray(module.fields?.moduleQuiz) && module.fields.moduleQuiz.length > 0) ? module.fields.moduleQuiz : [{
        sys: { id: `module-quiz-${moduleSlug}` },
        fields: {
          title: 'Module Quiz',
          slug: moduleSlug
        }
      }],
      moduleProject: module.fields?.moduleProject || [],
      moduleReview: module.fields?.moduleReview || null,
    };
  });

  return transformedModules;
}

export async function GET() {
  try {
    const modules = await getModules();

    // If there's an error in the result, return it
    if (modules && typeof modules === 'object' && 'error' in modules) {
      return NextResponse.json(modules, { status: 404 });
    }

    // Ensure we always return an array
    const modulesArray = Array.isArray(modules) ? modules : [];
    return NextResponse.json(modulesArray);
  } catch (error) {
    console.error("Error fetching modules:", error);
    return NextResponse.json(
      { error: "Failed to fetch modules" },
      { status: 500 }
    );
  }
}
