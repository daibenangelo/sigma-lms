import { notFound } from "next/navigation";
import { RichText } from "@/components/rich-text";
import { StackBlitzToggle } from "@/components/stackblitz-toggle";
import { getEntriesByContentType } from "@/lib/contentful";

type Params = {
  params: Promise<{ slug: string }>;
};

export default async function ChallengePage({ params }: Params) {
  const { slug } = await params;
  
  // Fetch challenge data from Contentful using the lessons API
  let challengeData: any = null;
  try {
    // First, get the course from the URL or use a default
    const course = "html"; // You can make this dynamic based on URL params if needed
    
    const response = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/lessons?course=${encodeURIComponent(course)}`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        notFound();
      }
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Find the challenge in the allContent array
    const challenge = data.allContent?.find((item: any) => 
      item.slug === slug && item.type === 'challenge'
    );
    
    if (!challenge) {
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

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{fields.title}</h1>
      <p className="text-gray-600 mb-6">Software Development Programme · Challenge</p>
      
      {/* Preview Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Preview</h2>
        <div className="p-6 rounded-lg border border-blue-200 bg-blue-50">
          <p>This is a preview of the {fields.title} challenge. You'll be building a practical project to demonstrate your skills.</p>
        </div>
      </section>

      {/* Content Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Instructions</h2>
        <div className="p-6 rounded-lg border border-gray-200 bg-white">
          <p>In this challenge, you'll create a {fields.title.toLowerCase()}. Follow the instructions below to complete the project.</p>
        </div>
      </section>

      {/* Test Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Test</h2>
        <div className="p-6 rounded-lg border border-orange-200 bg-orange-50">
          <p>Your project will be tested to ensure it meets the requirements. Make sure to follow all the specifications.</p>
        </div>
      </section>

      {/* Test Example Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Test Example</h2>
        <div className="p-6 rounded-lg border border-blue-200 bg-blue-50">
          <p>Here is an example of what your completed project should look like. Use this as a reference for your implementation.</p>
        </div>
      </section>

      {/* StackBlitz Toggleable Code Editor */}
      {fields.fullCodeSolution && (
        <StackBlitzToggle 
          document={fields.fullCodeSolution} 
          className="mb-6"
        />
      )}
    </div>
  );
}