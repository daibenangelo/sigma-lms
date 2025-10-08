import { notFound } from "next/navigation";
import { RichText } from "@/components/rich-text";
import { StackBlitzToggle } from "@/components/stackblitz-toggle";
import { getEntriesByContentType } from "@/lib/contentful";
import { getCachedLessons } from "@/lib/server-cache";
import CompletionIndicator from "@/components/CompletionIndicator";

type Params = {
  params: Promise<{ slug: string }>;
};

export default async function ChallengePage({ params, searchParams }: { params: Promise<{ slug: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { slug } = await params;
  const { course } = await searchParams;
  
  // Fetch challenge data from Contentful using the lessons API
  let challengeData: any = null;
  try {
    // Get the course from URL params or use a default
    const courseSlug = typeof course === 'string' ? course : 'html';
    console.log('[challenge] Using course slug:', courseSlug, 'for challenge slug:', slug);
    
    const data = await getCachedLessons(courseSlug);
    
    // Find the challenge in the allContent array
    const challenge = data.allContent?.find((item: any) => 
      item.slug === slug && item.type === 'challenge'
    );
    
    console.log('[challenge] Found challenge:', challenge?.title, 'in course:', courseSlug);
    console.log('[challenge] Available challenges:', data.allContent?.filter((item: any) => item.type === 'challenge').map((item: any) => item.slug));
    
    if (!challenge) {
      console.error('[challenge] Challenge not found for slug:', slug);
      notFound();
    }
    
    // Now fetch the actual challenge data directly from Contentful
    try {
      console.log('[challenge] Fetching challenge data from Contentful for slug:', slug);
      
      // Try different content types for challenges
      const challengeContentTypes = ['lessonChallenge', 'challenge', 'assignment', 'project'];
      let challengeEntry = null;
      
      for (const contentType of challengeContentTypes) {
        try {
          const entries = await getEntriesByContentType(contentType, {
            limit: 1,
            "fields.slug": slug,
            include: 10
          });
          
          if (entries && entries.length > 0) {
            challengeEntry = entries[0];
            console.log(`[challenge] Found challenge in content type: ${contentType}`);
            break;
          }
        } catch (e) {
          console.warn(`[challenge] Failed to fetch from ${contentType}:`, e);
        }
      }
      
      if (challengeEntry) {
        challengeData = challengeEntry;
        console.log('[challenge] Fetched challenge data:', challengeData.fields?.title);
      } else {
        console.warn('[challenge] No challenge found in Contentful, using fallback');
        // Fallback: create a basic structure with the title we found
        challengeData = {
          fields: {
            title: challenge.title,
            fullCodeSolution: {
              nodeType: 'document',
              content: [{
                nodeType: 'paragraph',
                content: [{
                  nodeType: 'text',
                  value: 'https://stackblitz.com/edit/web-platform-example'
                }]
              }]
            }
          }
        };
      }
    } catch (contentfulError) {
      console.error('[challenge] Contentful error:', contentfulError);
      // Fallback: create a basic structure with the title we found
      challengeData = {
        fields: {
          title: challenge.title,
          fullCodeSolution: {
            nodeType: 'document',
            content: [{
              nodeType: 'paragraph',
              content: [{
                nodeType: 'text',
                value: 'https://stackblitz.com/edit/web-platform-example'
              }]
            }]
          }
        }
      };
    }
  } catch (e) {
    console.error("Failed to fetch challenge data:", e);
    notFound();
  }

  if (!challengeData || !challengeData.fields) {
    notFound();
  }

  const { fields } = challengeData;

  // Debug: Log the starterCode field
  console.log('[challenge] Starter Code field:', fields.starterCode);

  const testJS = fields.testJS;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{fields.title}</h1>
      <p className="text-gray-600 mb-2">Software Development Programme · Challenge</p>
      <CompletionIndicator type="challenge" slug={slug} />
      
      {/* Preview Section */}
      {fields.preview && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Preview</h2>
          <div className="p-6 rounded-lg border border-blue-200 bg-blue-50">
            <RichText document={fields.preview} />
          </div>
        </section>
      )}

      {/* Content Section */}
      {fields.content && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Instructions</h2>
          <div className="p-6 rounded-lg border border-gray-200 bg-white">
            <RichText document={fields.content} />
          </div>
        </section>
      )}


      {/* Code Editor Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Code Editor</h2>
        <div className="p-6 rounded-lg border border-gray-200 bg-white">
          <p className="text-gray-600 mb-4">
            Use the code editor below to work on your challenge. You can write, test, and debug your code here.
          </p>
          <StackBlitzToggle 
            document={fields.starterCode || {
              nodeType: 'document',
              content: [{
                nodeType: 'paragraph',
                content: [{
                  nodeType: 'text',
                  value: 'https://stackblitz.com/edit/web-platform-example'
                }]
              }]
            }} 
            testJS={testJS}
            className="mb-6"
          />
        </div>
      </section>

    </div>
  );
}