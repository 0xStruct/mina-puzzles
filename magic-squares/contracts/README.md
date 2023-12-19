# Mina zkApp: Magic Squares

This contract is for puzzle game Magic Squares to flex one's math muscles.
5 x 5 matrix where all 5 rows, 5 columns and 2 diagonals need to sum up to same equal number.

Sounds simple yet no so simple.

This contract would host multiple games and support multiple solvers per contract.
To do that Mina event (along with archival node) and composable leaderboard utilizing Merkle Tree will be used.

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
