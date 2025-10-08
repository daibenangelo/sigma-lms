import { unstable_cache } from 'next/cache';

// Server-side cached API calls (per-course)
export const getCachedLessons = async (course: string) => {
  const runner = unstable_cache(
    async () => {
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';
      const url = `${baseUrl}/api/lessons?course=${encodeURIComponent(course)}`;
      const response = await fetch(url, {
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      return response.json();
    },
    ['lessons', course],
    {
      tags: ['lessons', `lessons-${course}`],
      revalidate: 300 // 5 minutes
    }
  );
  return runner();
};

export const getCachedModules = async (course?: string) => {
  const keyCourse = course || 'all';
  const runner = unstable_cache(
    async () => {
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';
      const url = course 
        ? `${baseUrl}/api/modules?course=${encodeURIComponent(course)}`
        : `${baseUrl}/api/modules`;
      const response = await fetch(url, {
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      return response.json();
    },
    ['modules', keyCourse],
    {
      tags: ['modules', `modules-${keyCourse}`],
      revalidate: 3600 // 1 hour
    }
  );
  return runner();
};

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
