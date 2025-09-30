"use client";

import { cacheManager } from "@/lib/cache";

export function useApiFetch() {
  const apiFetch = async (url: string, options?: RequestInit): Promise<Response> => {
    // Track the API call
    cacheManager.trackApiCall();
    
    // Make the actual fetch call
    return fetch(url, options);
  };

  return { apiFetch };
}
