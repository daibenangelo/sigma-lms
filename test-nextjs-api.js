// Test Next.js API endpoints
async function testAPI() {
  try {
    console.log('Testing /api/courses...');
    const response = await fetch('http://localhost:3000/api/courses', {
      timeout: 10000 // 10 second timeout
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Courses data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error testing courses API:', error.message);
    console.error('Error details:', error);
  }
}

testAPI();
