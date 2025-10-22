// Test Contentful connection directly
import { createClient } from 'contentful';

const space = '62eb4kv8suui';
const accessToken = 'XEo74euQNamntNtQGJTzReOQWHGv7D1QaSrcv3uCROw';

const client = createClient({
  space,
  accessToken,
});

async function testContentful() {
  try {
    console.log('Testing Contentful connection...');
    console.log('Space ID:', space);
    console.log('Access Token:', accessToken.substring(0, 10) + '...');

    // Try to get courses
    console.log('Fetching courses...');
    const courses = await client.getEntries({
      content_type: 'course',
      limit: 10
    });

    console.log('Found courses:', courses.items.length);
    console.log('Course data:', JSON.stringify(courses.items.map(c => ({
      id: c.sys.id,
      title: c.fields?.title,
      slug: c.fields?.slug
    })), null, 2));

  } catch (error) {
    console.error('Contentful error:', error.message);
    console.error('Error details:', error);
  }
}

testContentful();
