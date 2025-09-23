import { createClient } from "contentful";

const space = process.env.CONTENTFUL_SPACE_ID as string;
const environment = (process.env.CONTENTFUL_ENVIRONMENT || "master") as string;
const accessToken = process.env.CONTENTFUL_DELIVERY_TOKEN as string;
const previewToken = process.env.CONTENTFUL_PREVIEW_TOKEN as string | undefined;

if (!space || !accessToken) {
  // Fail fast during server startup if required env vars are missing
  console.warn(
    "[contentful] Missing CONTENTFUL_SPACE_ID or CONTENTFUL_DELIVERY_TOKEN. Add them to .env.local"
  );
}

export const contentfulClient = createClient({
  space,
  environment,
  accessToken,
});

export const contentfulPreviewClient = previewToken
  ? createClient({
      space,
      environment,
      accessToken: previewToken,
      host: "preview.contentful.com",
    })
  : undefined;

export type EntrySkeletonType<TFields> = {
  fields: TFields;
};

export async function getEntriesByContentType<TFields = any>(
  content_type: string,
  query: Record<string, any> = {}
) {
  const res = await contentfulClient.getEntries({
    content_type,
    ...query,
  });
  return res.items;
}

export async function getEntryById<TFields = any>(id: string) {
  return contentfulClient.getEntry(id);
}
