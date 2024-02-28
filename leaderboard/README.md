# Mina zkApp: Leaderboard

This Leaderboard is built using MerkleMap instead of MerkleTree as Key-Value format is better suited for this use-case.

The contract's method `addPoint` can only be called with signature on the specified admin.

The leaderboard is to be shared among various games to keep track of the players points.

Please refer to the tests on how to use it.

## Notes for running the leaderboard with off-chain storage [wip]

```sh
# need node version 18
nvm use 18

# to run the off-chain storage server
node node_modules/experimental-zkapp-offchain-storage-punkpoll/build/src/storageServer.js

# then build and run
npm run build
node build/src/LeaderboardTree.run.ts
```

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
