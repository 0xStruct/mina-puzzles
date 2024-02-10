# Mina zkApp: Tictactoe Redux

This project is to make Tictactoe more approachable by users P2P to play via Web UI.
3 different approaches on the game design were explored.

- Reusable game contract with each contract representing as a game room for 2 players to play together
- Recursive proofs, with P2P play real-time via websocket
- Above concept with settlement on Mina blockchain

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
