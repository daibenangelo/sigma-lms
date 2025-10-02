"use client";

import { useState, useEffect } from 'react';
import { cacheManager } from '@/lib/cache';
import { verifyCacheSystem, logCacheStatus } from '@/lib/cache-verification';

export default function CacheTestPage() {
  const [cacheStatus, setCacheStatus] = useState<any>(null);
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    // Run cache verification
    const status = verifyCacheSystem();
    setCacheStatus(status);
    logCacheStatus();
  }, []);

  const runCacheTest = async () => {
    const results: string[] = [];
    
    try {
      // Test 1: Basic cache operations
      cacheManager.set('/test/basic', { message: 'Hello Cache!' });
      const retrieved = cacheManager.get('/test/basic');
      results.push(`Basic cache test: ${retrieved?.message === 'Hello Cache!' ? 'PASS' : 'FAIL'}`);
      
      // Test 2: Cache expiration
      cacheManager.set('/test/expire', { message: 'Expire me' }, undefined, 100); // 100ms TTL
      await new Promise(resolve => setTimeout(resolve, 150));
      const expired = cacheManager.get('/test/expire');
      results.push(`Expiration test: ${expired === null ? 'PASS' : 'FAIL'}`);
      
      // Test 3: API call simulation
      const mockApiCall = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { data: 'API Response', timestamp: Date.now() };
      };
      
      // First call
      const start1 = Date.now();
      const result1 = await mockApiCall();
      const time1 = Date.now() - start1;
      
      // Second call (should be faster if cached)
      const start2 = Date.now();
      const result2 = await mockApiCall();
      const time2 = Date.now() - start2;
      
      results.push(`API simulation: First call ${time1}ms, Second call ${time2}ms`);
      
      // Test 4: Cache stats
      const stats = cacheManager.getStats();
      results.push(`Cache stats: ${stats.totalCalls} calls, ${stats.cacheHits} hits, ${stats.cacheMisses} misses`);
      
      setTestResults(results);
      
    } catch (error) {
      results.push(`Test error: ${error}`);
      setTestResults(results);
    }
  };

  const clearCache = () => {
    cacheManager.clear();
    const status = verifyCacheSystem();
    setCacheStatus(status);
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Cache System Test</h1>
        
        {/* Cache Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Cache Status</h2>
          {cacheStatus && (
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="font-medium">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  cacheStatus.isWorking ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {cacheStatus.isWorking ? 'Working' : 'Issues Found'}
                </span>
              </div>
              <div>Total API Calls: {cacheStatus.stats.totalCalls}</div>
              <div>Cache Hits: {cacheStatus.stats.cacheHits}</div>
              <div>Cache Misses: {cacheStatus.stats.cacheMisses}</div>
              <div>Hit Rate: {cacheStatus.stats.hitRate}%</div>
              <div>Cache Size: {cacheStatus.stats.cacheSize} entries</div>
              
              {cacheStatus.issues.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium text-red-600">Issues:</h3>
                  <ul className="list-disc list-inside text-red-600">
                    {cacheStatus.issues.map((issue: string, index: number) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Cache Tests</h2>
          <div className="space-x-4">
            <button
              onClick={runCacheTest}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Run Cache Tests
            </button>
            <button
              onClick={clearCache}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Clear Cache
            </button>
          </div>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div key={index} className="font-mono text-sm">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
