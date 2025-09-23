export type ContentfulBaseFields = {
  title?: string;
  slug?: string;
  description?: string;
};

export type CourseFields = ContentfulBaseFields & {
  level?: string;
  durationMinutes?: number;
};

export type LessonFields = ContentfulBaseFields & {
  body?: string;
  durationMinutes?: number;
};
