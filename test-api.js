// Simple test script to check API endpoints
async function testAPI() {
  try {
    console.log('Testing /api/courses...');
    const response = await fetch('http://localhost:3000/api/courses');
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Courses data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error testing courses API:', error.message);
  }
}

testAPI();
