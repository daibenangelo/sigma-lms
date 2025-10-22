// Test lessons API endpoint
async function testLessonsAPI() {
  try {
    console.log('Testing /api/lessons?course=git-and-github...');
    const response = await fetch('http://localhost:3000/api/lessons?course=git-and-github', {
      timeout: 10000
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Lessons data keys:', Object.keys(data));
    console.log('Course name:', data.courseName);
    console.log('Total content items:', data.allContent?.length || 0);
  } catch (error) {
    console.error('Error testing lessons API:', error.message);
    console.error('Error details:', error);
  }
}

testLessonsAPI();
