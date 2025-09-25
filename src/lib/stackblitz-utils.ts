export function extractStackBlitzUrl(richTextContent: any): string | null {
  if (!richTextContent || !richTextContent.content) return null;
