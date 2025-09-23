This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Contentful Setup

1) Create a space at Contentful and generate tokens
- CONTENTFUL_SPACE_ID
- CONTENTFUL_DELIVERY_TOKEN
- (optional) CONTENTFUL_PREVIEW_TOKEN
- (optional) CONTENTFUL_MANAGEMENT_TOKEN

2) Configure environment variables
- Copy `.env.local.example` to `.env.local`
- Fill in your values

3) Client usage example
```ts
// src/app/page.tsx
import { getEntriesByContentType } from "@/lib/contentful";

export default async function HtmlLessonIntro() {
  const lessons = await getEntriesByContentType<{ title: string }>("lesson", {
    limit: 1,
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Introduction to HTML</h1>
      <p className="text-gray-600 mb-6">Software Development Programme · Module: Web Foundations</p>
      <pre className="text-xs text-gray-500">{JSON.stringify(lessons[0]?.fields || {}, null, 2)}</pre>
    </div>
  );
}
```

Define a Content Type named `lesson` with at least a `title` (Short text) field in Contentful to test.
