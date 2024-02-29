## Rock-Paper-Scissors ASYNC UI

RPS game's long-term problem of cheating is solved now.
Commit choices privately the reveal later for fair play.

P2P realtime game play is now possible by leveraging recursive proofs and websocket.
No Mina wallet or blockchain interactions needed but still utilizing Mina ZK features.

Demo video: https://www.youtube.com/watch?v=xUO4q5diL08

- UI is built with NextJS
- Websocket is powered by Ably
- Redis KV storage is powered by Vercel

First set `.env`

```
cp .env.example .env
```

```
npm install
npm run dev
```

open webpages in 2 different browsers
then you can now play as both player 1 and player 2.

### how is zkProgram proof run

Now it is run on "server-side" as NextJS API, please refer to `pages/api/game/[gameId]/index.ts`
Proof generation leverages cache for faster compiling. 

In later months, optimizations and client-side proof generation would be explored.
