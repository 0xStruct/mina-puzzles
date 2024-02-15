# Mina zkApp: Rock Paper Scissors ASYNC

This project is to solve the problem in Rock-Paper-Scissors game where synchronous play is required.
Even IRL, cheating could happen through expression reading.

With Mina private proof, private choices can be made then revealed later for total fairness.

2 approaches were explored:
#1 Contract as game room
#2 Recursive proof, then P2P play via websocket

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

## How to setup puzzle
```sh
# after deploy, puzzleHash can be updated
npm run build
node ./build/src/update.js
```

## License

[Apache-2.0](LICENSE)
