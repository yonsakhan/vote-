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

## Local Create Flow Test

Start the dev server in one terminal:

```bash
npm run dev
```

Run the local create-flow verification in another terminal:

```bash
npm run test:create:local
```

The test script will:

- load variables from `.env.local`
- create or reset a local test user in Supabase
- sign in with email/password through Supabase Auth
- call `POST /api/polls`
- verify the created poll has at least two options
- delete the test poll by default after verification

Optional environment variables:

```bash
LOCAL_TEST_BASE_URL=http://localhost:3000
LOCAL_TEST_USER_EMAIL=local-create-flow@example.com
LOCAL_TEST_KEEP_DATA=1
```

Set `LOCAL_TEST_KEEP_DATA=1` if you want to keep the created poll for manual UI inspection after the script finishes.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
