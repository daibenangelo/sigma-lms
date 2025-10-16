-- Insert sample courses (keeping UUIDs consistent for easier testing)
INSERT INTO public.courses (id, title, description, slug, is_published) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Introduction to Web Development', 'Learn the fundamentals of web development including HTML, CSS, and JavaScript.', 'intro-web-dev', true),
  ('550e8400-e29b-41d4-a716-446655440002', 'Advanced React Patterns', 'Master advanced React concepts and patterns for building scalable applications.', 'advanced-react', true),
  ('550e8400-e29b-41d4-a716-446655440003', 'Database Design Fundamentals', 'Learn how to design efficient and scalable databases.', 'database-design', true);

-- Insert sample modules for Introduction to Web Development
INSERT INTO public.modules (id, course_id, title, description, slug, order_index, is_published) VALUES
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'HTML Basics', 'Learn the fundamentals of HTML markup', 'html-basics', 1, true),
  ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'CSS Styling', 'Master CSS for beautiful web pages', 'css-styling', 2, true),
  ('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'JavaScript Fundamentals', 'Learn JavaScript programming basics', 'javascript-fundamentals', 3, true);

-- Insert sample modules for Advanced React Patterns
INSERT INTO public.modules (id, course_id, title, description, slug, order_index, is_published) VALUES
  ('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'Hooks Deep Dive', 'Master React hooks and custom hooks', 'hooks-deep-dive', 1, true),
  ('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', 'State Management', 'Learn advanced state management patterns', 'state-management', 2, true),
  ('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', 'Performance Optimization', 'Optimize React applications for better performance', 'performance-optimization', 3, true);

-- Insert sample lessons for HTML Basics module
INSERT INTO public.lessons (id, module_id, title, content, slug, order_index, duration_minutes, is_published) VALUES
  ('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'Introduction to HTML', '{"content": [{"nodeType": "paragraph", "content": [{"nodeType": "text", "value": "HTML (HyperText Markup Language) is the standard markup language for creating web pages."}]}]}', 'introduction-to-html', 1, 30, true),
  ('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', 'HTML Elements and Tags', '{"content": [{"nodeType": "paragraph", "content": [{"nodeType": "text", "value": "Learn about HTML elements, tags, and their proper usage."}]}]}', 'html-elements-and-tags', 2, 45, true),
  ('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', 'HTML Forms', '{"content": [{"nodeType": "paragraph", "content": [{"nodeType": "text", "value": "Create interactive forms with HTML form elements."}]}]}', 'html-forms', 3, 60, true);

-- Insert sample lessons for CSS Styling module
INSERT INTO public.lessons (id, module_id, title, content, slug, order_index, duration_minutes, is_published) VALUES
  ('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002', 'CSS Basics', '{"content": [{"nodeType": "paragraph", "content": [{"nodeType": "text", "value": "Learn the fundamentals of CSS styling and selectors."}]}]}', 'css-basics', 1, 40, true),
  ('770e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440002', 'CSS Layout', '{"content": [{"nodeType": "paragraph", "content": [{"nodeType": "text", "value": "Master CSS layout techniques including Flexbox and Grid."}]}]}', 'css-layout', 2, 50, true);

-- Insert sample quizzes
INSERT INTO public.quizzes (id, lesson_id, title, questions, passing_score, time_limit_minutes, is_published) VALUES
  ('880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'HTML Basics Quiz', 
   '{"questions": [{"id": "1", "question": "What does HTML stand for?", "type": "multiple-choice", "options": ["HyperText Markup Language", "High Tech Modern Language", "Home Tool Markup Language"], "correct": 0}, {"id": "2", "question": "Which tag is used for the largest heading?", "type": "multiple-choice", "options": ["<h1>", "<h6>", "<head>"], "correct": 0}]}', 
   70, 15, true),
  ('880e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440004', 'CSS Basics Quiz',
   '{"questions": [{"id": "1", "question": "What does CSS stand for?", "type": "multiple-choice", "options": ["Cascading Style Sheets", "Computer Style Sheets", "Creative Style Sheets"], "correct": 0}, {"id": "2", "question": "Which property is used to change the text color?", "type": "multiple-choice", "options": ["color", "text-color", "font-color"], "correct": 0}]}',
   70, 15, true);
