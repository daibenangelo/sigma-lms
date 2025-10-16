interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface ApiCallStats {
  totalCalls: number;
  cacheHits: number;
  cacheMisses: number;
}

const STORAGE_KEY = "lms-api-stats";

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private stats: ApiCallStats = {
    totalCalls: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  // Default TTL: 10 minutes for most content, 1 hour for modules, 30 minutes for quizzes
  private defaultTTL = 10 * 60 * 1000; // 10 minutes
  private moduleTTL = 60 * 60 * 1000; // 1 hour
  private quizTTL = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Load stats from localStorage on client side
    if (typeof window !== "undefined") {
      this.loadStats();
    }
  }

  private loadStats(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.stats = { ...this.stats, ...parsed };
      }
    } catch (e) {
      console.error("Failed to load API stats:", e);
    }
  }

  private saveStats(): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stats));
      } catch (e) {
        console.error("Failed to save API stats:", e);
      }
    }
  }

  private getTTL(endpoint: string): number {
    if (endpoint.includes("/modules") || endpoint.includes("modules")) {
      return this.moduleTTL;
    }
    if (endpoint.includes("/quizzes") || endpoint.includes("quizzes")) {
      return this.quizTTL;
    }
    return this.defaultTTL;
  }

  private generateKey(endpoint: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : "";
    return `${endpoint}${paramString}`;
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  get<T>(endpoint: string, params?: Record<string, any>): T | null {
    const key = this.generateKey(endpoint, params);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.cacheMisses++;
      this.saveStats();
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.cacheMisses++;
      this.saveStats();
      return null;
    }

    this.stats.cacheHits++;
    this.saveStats();
    return entry.data as T;
  }

  set<T>(endpoint: string, data: T, params?: Record<string, any>, customTTL?: number): void {
    const key = this.generateKey(endpoint, params);
    const ttl = customTTL || this.getTTL(endpoint);
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  // Track API calls
  trackApiCall(): void {
    this.stats.totalCalls++;
    this.saveStats();
  }

  // Get cache statistics
  getStats(): ApiCallStats {
    return { ...this.stats };
  }

  // Reset stats
  resetStats(): void {
    this.stats = {
      totalCalls: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    this.saveStats();
  }

  // Clear cache
  clear(): void {
    this.cache.clear();
  }

  // Clear expired entries
  cleanup(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache size
  getSize(): number {
    return this.cache.size;
  }
}

// Global cache instance
export const cacheManager = new CacheManager();

// Listen for database reset events to clear cache
if (typeof window !== 'undefined') {
  window.addEventListener('database-reset', () => {
    console.log('[CacheManager] Database reset detected, clearing cache');
    cacheManager.clear();
    cacheManager.resetStats();
  });
}

// Cleanup expired entries every 10 minutes
if (typeof window === "undefined") {
  setInterval(() => {
    cacheManager.cleanup();
  }, 10 * 60 * 1000);
}

// Helper function to wrap API calls with caching
export async function withCache<T>(
  endpoint: string,
  apiCall: () => Promise<T>,
  params?: Record<string, any>,
  customTTL?: number
): Promise<T> {
  // Check cache first
  const cached = cacheManager.get<T>(endpoint, params);
  if (cached !== null) {
    return cached;
  }

  // Track API call
  cacheManager.trackApiCall();

  // Make API call
  const data = await apiCall();
  
  // Store in cache
  cacheManager.set(endpoint, data, params, customTTL);
  
  return data;
}

// Export types
export type { ApiCallStats };
