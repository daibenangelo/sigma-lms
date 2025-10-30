import { NextResponse } from "next/server";
import { getEntriesByContentType } from "@/lib/contentful";

// Function to get module project by slug and module
async function getModuleProject(projectSlug: string, moduleSlug?: string) {
  try {
    console.log(`[module-project API] Looking for project: ${projectSlug}, module: ${moduleSlug}`);

    // If moduleSlug is provided, find the project through the module
    if (moduleSlug) {
      console.log(`[module-project API] Fetching module ${moduleSlug} first`);

      const modules = await getEntriesByContentType<{
        title?: string;
        slug?: string;
        moduleProject?: any[];
      }>(
        "module",
        { limit: 1, "fields.slug": moduleSlug, include: 10 }
      );

      if (modules.length === 0) {
        console.log(`[module-project API] Module ${moduleSlug} not found`);
        return { error: "Module not found", project: null };
      }

      const module = modules[0];
      const moduleProjects = module.fields?.moduleProject;

      console.log(`[module-project API] Module has ${Array.isArray(moduleProjects) ? moduleProjects.length : 0} linked projects`);

      if (Array.isArray(moduleProjects) && moduleProjects.length > 0) {
        // Find the project with matching slug
        const linkedProject = moduleProjects.find((mp: any) => {
          const mpSlug = mp.fields?.slug;
          console.log(`[module-project API] Checking project slug: ${mpSlug} against ${projectSlug}`);
          return mpSlug === projectSlug;
        });

        if (linkedProject && typeof linkedProject === 'object' && 'fields' in linkedProject) {
          const projectData = linkedProject as any; // Type assertion for Contentful data
          console.log(`[module-project API] Found linked project: ${projectData.fields?.title}`);
          return {
            project: linkedProject,
            moduleTitle: module.fields?.title || 'Module'
          };
        }
      }

      console.log(`[module-project API] Project ${projectSlug} not found in module ${moduleSlug}`);
      return { error: "Project not found in module", project: null };
    }

    // Fallback: try to fetch project directly by slug
    console.log(`[module-project API] Fallback: fetching project directly by slug`);
    const projects = await getEntriesByContentType<{
      title?: string;
      slug?: string;
      preview?: any;
      goal?: any;
      requirements?: any;
      starterCode?: any;
    }>(
      "moduleProject",
      { limit: 1, "fields.slug": projectSlug, include: 10 }
    );

    if (projects.length > 0) {
      console.log(`[module-project API] Found project directly: ${projects[0].fields?.title}`);
      return { project: projects[0], moduleTitle: 'Module' };
    }

    console.log(`[module-project API] Project ${projectSlug} not found anywhere`);
    return { error: "Project not found", project: null };

  } catch (error) {
    console.error(`[module-project API] Error fetching module project:`, error);
    return { error: "Failed to fetch module project", project: null };
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectSlug = searchParams.get('projectSlug');
    const moduleSlug = searchParams.get('module');

    console.log(`[module-project API] Received request for project: ${projectSlug}, module: ${moduleSlug}`);

    if (!projectSlug) {
      return NextResponse.json(
        { error: "Project slug is required" },
        { status: 400 }
      );
    }

    const result = await getModuleProject(projectSlug, moduleSlug || undefined);

    if (result.error) {
      return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error("[module-project API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch module project" },
      { status: 500 }
    );
  }
}
