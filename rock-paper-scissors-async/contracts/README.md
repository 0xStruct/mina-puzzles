# Mina zkApp: Rock Paper Scissors ASYNC

This project is to solve the problem in Rock-Paper-Scissors game where synchronous play is required.
Even IRL, cheating could happen through expression reading.

With Mina private proof, private choices can be made then revealed later for total fairness.

## 2 approaches are explored:

#1 Game contract as game room for p1 and p2 to play

#2 Recursive proof, then P2P play via websocket
    please refer to `src/RpsProve.ts`...
        - `choice` method is used to generate proof for hidden choice hashed with `[choice, secret, gameId]`
        - `reveal` method is used to genrate proof that previous choiceProof is maded by the person with same `secret`
        - `gameId` is used to prevent replay attacks

#3 Validate the recursive proof via SmartContract, keep track through contract @state
    please refer to `src/RpsProveValidator.ts`
        - p1Proof and p2Proof are compared through `validate` method
        - `gameCount` and `drawCount` are tracked within contract @state
        - event is emitted

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
