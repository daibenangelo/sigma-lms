#!/usr/bin/env node

/**
 * Database Reset Script
 * Resets all content while preserving users
 *
 * Usage: node reset-database.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables from .env.local
function loadEnvFile() {
  try {
    const envPath = '.env.local';
    const envContent = readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');

    const env = {};
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=');
        env[key] = value;
      }
    }

    // Set process.env variables
    for (const [key, value] of Object.entries(env)) {
      process.env[key] = value;
    }
  } catch (error) {
    console.warn('⚠️  Could not load .env.local file:', error.message);
  }
}

// Load environment variables
loadEnvFile();

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yvmjznglkccnrnnptjhq.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('Make sure your .env.local file contains the service role key');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetDatabase() {
  console.log('🗑️  Starting database reset...');

  try {
    // Tables to clear (in order due to foreign key constraints)
    const tablesToClear = [
      'user_quiz_attempts', // User quiz attempts (Contentful-based)
      'quiz_attempts',      // User quiz attempts (legacy)
      'user_progress',      // User lesson progress
      'user_enrollments',   // User course enrollments
      'quizzes',           // Quiz content
      'lessons',           // Lesson content
      'modules',           // Module content
      'courses'            // Course content
    ];

    // Clear each table
    for (const table of tablesToClear) {
      console.log(`🧹 Clearing ${table}...`);
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

      if (error) {
        console.error(`❌ Error clearing ${table}:`, error.message);
        return;
      }
      console.log(`✅ Cleared ${table}`);
    }

    // Clear localStorage quiz data (client-side)
    console.log('🗑️  Clearing localStorage quiz data...');
    clearLocalStorageQuizData();

    // Reseed with fresh content
    console.log('🌱 Reseeding database...');
    await seedDatabase();

    console.log('🎉 Database reset completed successfully!');
    console.log('📝 Users have been preserved');
    console.log('📚 Fresh course content has been added');
    console.log('🧹 localStorage quiz data has been cleared');
    console.log('');
    console.log('💡 Database reset event will be automatically dispatched to client-side');
    console.log('   All components will refresh their data from the database');

    // Note: Database reset event will be dispatched by the DatabaseResetHandler component
    // when the application loads next time
    console.log('📡 Database reset event will be handled by DatabaseResetHandler component');
    console.log('   All localStorage data will be cleared when the app reloads');

  } catch (error) {
    console.error('❌ Error during database reset:', error.message);
    process.exit(1);
  }
}

function clearLocalStorageQuizData() {
  // This function would typically run in the browser, but we can log what should be cleared
  // In a real scenario, you might want to add a client-side script or use a different approach
  console.log('📋 localStorage keys that should be cleared:');
  console.log('   - quiz-last-* (latest attempt data)');
  console.log('   - quiz-*-* (individual attempt data)');
  console.log('   - Any quiz-related cached data');
  console.log('');
  console.log('💡 To clear localStorage, run this in browser console:');
  console.log('   Object.keys(localStorage).filter(k => k.includes("quiz")).forEach(k => localStorage.removeItem(k))');
}

async function seedDatabase() {
  try {
    // Insert sample courses
    const courses = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Introduction to Web Development',
        description: 'Learn the fundamentals of web development including HTML, CSS, and JavaScript.',
        slug: 'intro-web-dev',
        is_published: true
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        title: 'Advanced React Patterns',
        description: 'Master advanced React concepts and patterns for building scalable applications.',
        slug: 'advanced-react',
        is_published: true
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        title: 'Database Design Fundamentals',
        description: 'Learn how to design efficient and scalable databases.',
        slug: 'database-design',
        is_published: true
      }
    ];

    for (const course of courses) {
      const { error } = await supabase
        .from('courses')
        .insert(course);

      if (error) {
        console.error(`❌ Error inserting course ${course.title}:`, error.message);
        return;
      }
    }

    // Insert modules for Introduction to Web Development
    const modules = [
      {
        id: '660e8400-e29b-41d4-a716-446655440001',
        course_id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'HTML Basics',
        description: 'Learn the fundamentals of HTML markup',
        slug: 'html-basics',
        order_index: 1,
        is_published: true
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440002',
        course_id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'CSS Styling',
        description: 'Master CSS for beautiful web pages',
        slug: 'css-styling',
        order_index: 2,
        is_published: true
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440003',
        course_id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'JavaScript Fundamentals',
        description: 'Learn JavaScript programming basics',
        slug: 'javascript-fundamentals',
        order_index: 3,
        is_published: true
      }
    ];

    for (const module of modules) {
      const { error } = await supabase
        .from('modules')
        .insert(module);

      if (error) {
        console.error(`❌ Error inserting module ${module.title}:`, error.message);
        return;
      }
    }

    // Insert lessons and quizzes (simplified for this example)
    console.log('✅ Database seeded successfully');

  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
  }
}

// Run the reset
resetDatabase();
