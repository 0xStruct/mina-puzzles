# Mina zkApp: Leaderboard

This Leaderboard is built using MerkleMap instead of MerkleTree as Key-Value format is better suited for this use-case.

The contract's method `addPoint` can only be called with signature on the specified admin.

The leaderboard is to be shared among various games to keep track of the players points.

Please refer to the tests on how to use it.

## How to build

```sh
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

## License

[Apache-2.0](LICENSE)
