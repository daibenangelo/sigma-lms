import { unstable_cache } from 'next/cache';

// Server-side cached API calls (per-course)
export const getCachedLessons = async (course: string) => {
  const runner = unstable_cache(
    async () => {
      console.log('[server-cache] DEBUG - getCachedLessons called for course:', course);
      console.log('[server-cache] DEBUG - VERCEL_URL:', process.env.VERCEL_URL);

      // Use absolute URL for Vercel compatibility
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';
      const url = `${baseUrl}/api/lessons?course=${encodeURIComponent(course)}`;

      console.log('[server-cache] DEBUG - Fetching from URL:', url);

      const response = await fetch(url, {
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }
      });

      console.log('[server-cache] DEBUG - Response status:', response.status);

      if (!response.ok) {
        console.error('[server-cache] DEBUG - API request failed:', response.status, response.statusText);
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('[server-cache] DEBUG - Response data keys:', Object.keys(data));
      return data;
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
      console.log('[server-cache] DEBUG - getCachedModules called for course:', keyCourse);

      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';
      const url = course
        ? `${baseUrl}/api/modules?course=${encodeURIComponent(course)}`
        : `${baseUrl}/api/modules`;

      console.log('[server-cache] DEBUG - Fetching modules from URL:', url);

      const response = await fetch(url, {
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        console.error('[server-cache] DEBUG - Modules API request failed:', response.status, response.statusText);
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
    console.log('[server-cache] DEBUG - getCachedQuizzes called');

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    const url = `${baseUrl}/api/quizzes`;

    console.log('[server-cache] DEBUG - Fetching quizzes from URL:', url);

    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log('[server-cache] DEBUG - Quizzes response status:', response.status);

    if (!response.ok) {
      console.error('[server-cache] DEBUG - Quizzes API request failed:', response.status, response.statusText);
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
