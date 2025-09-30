import { unstable_cache } from 'next/cache';

// Server-side cached API calls
export const getCachedLessons = unstable_cache(
  async (course: string) => {
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    
    const url = `${baseUrl}/api/lessons?course=${encodeURIComponent(course)}`;
    
    const response = await fetch(url, {
      cache: 'no-store', // Ensure fresh data for server-side
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return response.json();
  },
  ['lessons'],
  {
    tags: ['lessons'],
    revalidate: 300 // 5 minutes
  }
);

export const getCachedModules = unstable_cache(
  async (course?: string) => {
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    
    const url = course 
      ? `${baseUrl}/api/modules?course=${encodeURIComponent(course)}`
      : `${baseUrl}/api/modules`;
    
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return response.json();
  },
  ['modules'],
  {
    tags: ['modules'],
    revalidate: 3600 // 1 hour
  }
);

export const getCachedQuizzes = unstable_cache(
  async () => {
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    
    const url = `${baseUrl}/api/quizzes`;
    
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return response.json();
  },
  ['quizzes'],
  {
    tags: ['quizzes'],
    revalidate: 1800 // 30 minutes
  }
);
