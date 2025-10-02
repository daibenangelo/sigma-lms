// Cache verification utility
import { cacheManager } from './cache';

export interface CacheVerificationResult {
  isWorking: boolean;
  issues: string[];
  stats: {
    totalCalls: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
    cacheSize: number;
  };
}

export function verifyCacheSystem(): CacheVerificationResult {
  const issues: string[] = [];
  const stats = cacheManager.getStats();
  const cacheSize = cacheManager.getSize();
  
  // Calculate hit rate
  const hitRate = stats.totalCalls > 0 ? (stats.cacheHits / stats.totalCalls) * 100 : 0;
  
  // Check for potential issues
  if (stats.totalCalls === 0) {
    issues.push("No API calls have been tracked - cache may not be in use");
  }
  
  if (hitRate < 10 && stats.totalCalls > 5) {
    issues.push("Low cache hit rate - cache may not be working effectively");
  }
  
  if (cacheSize === 0 && stats.totalCalls > 0) {
    issues.push("Cache is empty despite API calls - entries may be expiring too quickly");
  }
  
  return {
    isWorking: issues.length === 0,
    issues,
    stats: {
      ...stats,
      hitRate: Math.round(hitRate * 100) / 100,
      cacheSize
    }
  };
}

export function logCacheStatus(): void {
  const result = verifyCacheSystem();
  
  console.log("=== CACHE SYSTEM STATUS ===");
  console.log(`Working: ${result.isWorking ? '✅' : '❌'}`);
  console.log(`Total API Calls: ${result.stats.totalCalls}`);
  console.log(`Cache Hits: ${result.stats.cacheHits}`);
  console.log(`Cache Misses: ${result.stats.cacheMisses}`);
  console.log(`Hit Rate: ${result.stats.hitRate}%`);
  console.log(`Cache Size: ${result.stats.cacheSize} entries`);
  
  if (result.issues.length > 0) {
    console.log("\n⚠️  Issues found:");
    result.issues.forEach(issue => console.log(`  - ${issue}`));
  }
  
  console.log("===========================");
}
