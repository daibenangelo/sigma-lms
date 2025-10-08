"use client";

import { useCallback } from 'react';
import { withCache } from '@/lib/cache';

export function useCachedFetch() {
  const cachedFetch = useCallback(async <T>(
    url: string,
    options?: RequestInit,
    ttl?: number
  ): Promise<T> => {
    return withCache(
      url,
      async () => {
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      },
      undefined, // params
      ttl
    );
  }, []);

  return { cachedFetch };
}

// Specialized hooks for different content types
export function useLessonsFetch() {
  const { cachedFetch } = useCachedFetch();

  const fetchLessons = useCallback(async (course: string) => {
    return cachedFetch<{
      allContent: Array<{
        title: string;
        slug: string;
        type: 'lesson' | 'quiz' | 'module-quiz' | 'tutorial' | 'challenge';
      }>;
      courseName: string;
    }>(`/api/lessons?course=${encodeURIComponent(course)}`, undefined, 10 * 60 * 1000); // 10 minutes TTL
  }, [cachedFetch]);

  return { fetchLessons };
}

export function useModulesFetch() {
  const { cachedFetch } = useCachedFetch();

  const fetchModules = useCallback(async (course?: string) => {
    const url = course ? `/api/modules?course=${encodeURIComponent(course)}` : '/api/modules';
    return cachedFetch<Array<{
      title: string;
      slug: string;
      description: string;
    }>>(url, undefined, 60 * 60 * 1000); // 1 hour TTL
  }, [cachedFetch]);

  return { fetchModules };
}

export function useQuizzesFetch() {
  const { cachedFetch } = useCachedFetch();

  const fetchQuizzes = useCallback(async () => {
    return cachedFetch<Array<{
      title: string;
      slug: string;
      type: string;
    }>>('/api/quizzes', undefined, 30 * 60 * 1000); // 30 minutes TTL
  }, [cachedFetch]);

  return { fetchQuizzes };
}
