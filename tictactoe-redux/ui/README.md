## TicTacToe Redux

This TicTacToe Redux is made for approachable game play.
The game can be play realtime or asynchronously as last game proof is cached and reused upon restart.

P2P realtime game play is now available by leveraging recursive proofs and websocket.
No Mina wallet or blockchain interactions needed but still utilizing Mina ZK features.

Demo video: https://www.youtube.com/watch?v=wbA30WsLbOI

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
