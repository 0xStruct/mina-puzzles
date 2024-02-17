# Mina zkApp: Tictactoe Redux

This project is to make Tictactoe more approachable by users P2P to play via Web UI.


## 3 different approaches on the game design were explored.

#1 Reusable game contract with each contract representing as a game room for 2 players to play together
    please refer to `src/Tictactoe.ts`...
        - `startGame` is used to start a game with player1 waiting for player2 to join in
        - `joinGame` is used to join for player2
        - `resetGame` is used for resetting game so that contract can be reused for a new game
        - UI can be powered by websocket treating each contract as a game room/channel, so with just a few contracts multiple gamers can be entertained

#2 Recursive proofs, with P2P play real-time via websocket
    please refer to `src/TictactoeProve.ts`...
        - `start` method is used to generate baseProof for further moveProof to build on recursively
        - `move` method is used to generate moveProof for valid move by the right player
        - `gameId` is used to prevent replay attacks

#3 Above concept with settlement on Mina blockchain

## How to start, build

```sh
npm install
npm run build
```

## How to run tests

```sh
npm run test
npm run testw # watch mode
```

## How to run coverage

```sh
npm run coverage
```

## How to deploy

```sh
# configure key
zk config

# deployed with earlier setup key
zk deploy [alias]
```

## License

[Apache-2.0](LICENSE)
