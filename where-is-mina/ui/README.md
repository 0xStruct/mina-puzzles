This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, deploy the contract and set `NEXT_PUBLIC_ZKAPP_ADDRESS` in `.env.local`

```bash
cp .env.local.example .env.local
```

Then, run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.page.tsx`. The page auto-updates as you edit the file.

## About UI

This is built to work with where-is-mina contract. UI is built with reference to o1js tutorial.
Attention is built to allow smooth UX, so that game is playable while setup and compile are done in the background.

Players can start solving their puzzles without waiting.
