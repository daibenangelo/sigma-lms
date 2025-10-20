import { notFound } from "next/navigation";
import { Metadata } from "next";
import { RichText } from "@/components/rich-text";
import { StackBlitzToggle } from "@/components/stackblitz-toggle";
import { getEntriesByContentType } from "@/lib/contentful";
import CompletionIndicator from "@/components/CompletionIndicator";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  try {
    // Try different content types for challenges
    const challengeContentTypes = ['lessonChallenge', 'challenge', 'assignment'];
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
          break;
        }
      } catch (e) {
        console.error(`Failed to fetch from ${contentType}:`, e);
      }
    }

    if (!challengeEntry) {
      return {
        title: "Challenge Not Found | Sigma LMS",
        description: "The requested coding challenge could not be found.",
      };
    }

    const { fields } = challengeEntry;
    const title = fields.title || "Coding Challenge";
    const preview = fields.preview;

    // Extract description from preview or content
    let description = "Hands-on coding challenge to practice programming skills and problem-solving.";
    if (preview && preview.content && preview.content.length > 0) {
      const firstParagraph = preview.content.find((node: any) => node.nodeType === 'paragraph');
      if (firstParagraph && firstParagraph.content) {
        const textContent = firstParagraph.content
          .filter((node: any) => node.nodeType === 'text')
          .map((node: any) => node.value)
          .join(' ');
        if (textContent.length > 50) {
          description = textContent.substring(0, 150) + "...";
        } else {
          description = textContent;
        }
      }
    } else if (fields.content && fields.content.content && fields.content.content.length > 0) {
      const firstParagraph = fields.content.content.find((node: any) => node.nodeType === 'paragraph');
      if (firstParagraph && firstParagraph.content) {
        const textContent = firstParagraph.content
          .filter((node: any) => node.nodeType === 'text')
          .map((node: any) => node.value)
          .join(' ');
        if (textContent.length > 50) {
          description = textContent.substring(0, 150) + "...";
        } else {
          description = textContent;
        }
      }
    }

    return {
      title: `${title} | Sigma LMS`,
      description,
      keywords: ["challenge", "programming", "coding", "software development", "practice", title.toLowerCase()],
      openGraph: {
        title: `${title} | Sigma LMS`,
        description,
        type: "website",
      },
      twitter: {
        card: "summary",
        title: `${title} | Sigma LMS`,
        description,
      },
    };
  } catch (error) {
    console.error("Error generating metadata for challenge:", error);
    return {
      title: "Challenge | Sigma LMS",
      description: "Interactive coding challenges and programming exercises.",
    };
  }
}

export default async function ChallengePage({ params, searchParams }: { params: Promise<{ slug: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { slug } = await params;
  const { course } = await searchParams;
  
  console.log('[challenge] DEBUG - Starting challenge page for slug:', slug);
  console.log('[challenge] DEBUG - Course param:', course);
  
  // Fetch challenge data directly from Contentful (bypass API route)
  let challengeData: any = null;
  try {
    // Try different content types for challenges
    const challengeContentTypes = ['lessonChallenge', 'challenge', 'assignment'];
    let challengeEntry = null;
    
    for (const contentType of challengeContentTypes) {
      try {
        console.log(`[challenge] DEBUG - Trying content type: ${contentType}`);
        const entries = await getEntriesByContentType(contentType, {
          limit: 1,
          "fields.slug": slug,
          include: 10
        });
        
        console.log(`[challenge] DEBUG - ${contentType} returned ${entries?.length || 0} entries`);
        
        if (entries && entries.length > 0) {
          challengeEntry = entries[0];
          console.log(`[challenge] DEBUG - Found challenge in content type: ${contentType}, title: ${challengeEntry.fields?.title}`);
          break;
        }
      } catch (e) {
        console.error(`[challenge] DEBUG - Failed to fetch from ${contentType}:`, e);
      }
    }
    
    if (challengeEntry) {
      challengeData = challengeEntry;
      console.log('[challenge] DEBUG - Successfully fetched challenge data:', challengeData.fields?.title);
    } else {
      console.error('[challenge] DEBUG - No challenge found in any content type for slug:', slug);
      notFound();
    }
  } catch (e) {
    console.error("[challenge] DEBUG - Failed to fetch challenge data:", e);
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
    <div className="max-w-4xl mx-auto pb-[30vh]">
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
          />
        </div>
      </section>

    </div>
  );
}