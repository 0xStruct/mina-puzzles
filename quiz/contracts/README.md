# Mina zkApp: Quiz

Test out your knowledge about certain topics. 
On UI NextJS app, there would be a few quizzes about Mina. See if you know Mina well :P

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
