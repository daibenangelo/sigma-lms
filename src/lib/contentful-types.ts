export type ContentfulBaseFields = {
  title?: string;
  slug?: string;
  description?: string;
};

export type CourseFields = ContentfulBaseFields & {
  chapters?: any[]; // Array of linked entries
};

export type LessonFields = ContentfulBaseFields & {
  body?: string;
  durationMinutes?: number;
};
