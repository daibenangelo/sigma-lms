// Simple test to verify cache implementation
import { cacheManager } from './cache';
import { withCache } from './cache';

// Test basic cache functionality
export async function testCacheImplementation() {
  console.log('Testing cache implementation...');
  
  // Test 1: Basic set/get
  const testData = { message: 'Hello, Cache!' };
  cacheManager.set('/test/endpoint', testData);
  const retrieved = cacheManager.get('/test/endpoint');
  
  console.log('Test 1 - Basic set/get:', retrieved?.message === 'Hello, Cache!' ? 'PASS' : 'FAIL');
  
  // Test 2: Cache expiration
  cacheManager.set('/test/expired', testData, undefined, 1); // 1ms TTL
  await new Promise(resolve => setTimeout(resolve, 10)); // Wait 10ms
  const expired = cacheManager.get('/test/expired');
  
  console.log('Test 2 - Cache expiration:', expired === null ? 'PASS' : 'FAIL');
  
  // Test 3: withCache wrapper
  let callCount = 0;
  const mockApiCall = async () => {
    callCount++;
    return { data: 'API Response', callCount };
  };
  
  // First call should hit API
  const result1 = await withCache('/test/wrapper', mockApiCall);
  // Second call should hit cache
  const result2 = await withCache('/test/wrapper', mockApiCall);
  
  console.log('Test 3 - withCache wrapper:', callCount === 1 && result1.data === result2.data ? 'PASS' : 'FAIL');
  
  // Test 4: Cache stats
  const stats = cacheManager.getStats();
  console.log('Test 4 - Cache stats:', stats.totalCalls > 0 ? 'PASS' : 'FAIL');
  console.log('Cache stats:', stats);
  
  // Cleanup
  cacheManager.clear();
  console.log('Cache implementation test completed!');
}

// Export for manual testing
export { testCacheImplementation };
