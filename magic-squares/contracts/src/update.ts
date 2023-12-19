/**
 * This script can be used to interact with the Sudoku contract, after deploying it.
 *
 * We call the update() method on the contract, create a proof and send it to the chain.
 * The endpoint that we interact with is read from your config.json.
 *
 * This simulates a user interacting with the zkApp from a browser, except that here, sending the transaction happens
 * from the script and we're using your pre-funded zkApp account to pay the transaction fee. In a real web app, the user's wallet
 * would send the transaction and pay the fee
 *
 * To run locally:
 * Build the project: `$ npm run build`
 * Run with node:     `$ node build/src/update.js <deployAlias>`.
 */
import { Mina, PrivateKey, fetchAccount } from 'o1js';
import fs from 'fs/promises';
import { MagicSquaresZkApp, PuzzleStruct } from './MagicSquares.js';

// check command line arg
let deployAlias = process.argv[2];
if (!deployAlias)
  throw Error(`Missing <deployAlias> argument.
  
  Usage:
  node build/src/init.js <deployAlias>
  `);
Error.stackTraceLimit = 1000;

// parse config and private key from file
type Config = {
  deployAliases: Record<
    string,
    {
      url: string;
      keyPath: string;
      fee: string;
      feepayerKeyPath: string;
      feepayerAlias: string;
    }
  >;
};
let configJson: Config = JSON.parse(await fs.readFile('config.json', 'utf8'));
let config = configJson.deployAliases[deployAlias];
let feepayerKeysBase58: { privateKey: string; publicKey: string } = JSON.parse(
  await fs.readFile(config.feepayerKeyPath, 'utf8')
);

let zkAppKeysBase58: { privateKey: string; publicKey: string } = JSON.parse(
  await fs.readFile(config.keyPath, 'utf8')
);

let feepayerKey = PrivateKey.fromBase58(feepayerKeysBase58.privateKey);
let zkAppKey = PrivateKey.fromBase58(zkAppKeysBase58.privateKey);

// set up Mina instance and contract we interact with
const Network = Mina.Network(config.url);
const fee = Number(config.fee) * 1e9; // in nanomina (1 billion = 1.0 mina)
Mina.setActiveInstance(Network);
let feepayerAddress = feepayerKey.toPublicKey();
let zkAppAddress = zkAppKey.toPublicKey();
let zkApp = new MagicSquaresZkApp(zkAppAddress);

const puzzle = [
  [0, 24, 1, 8, 15],
  [0, 5, 7, 14, 16],
  [0, 6, 13, 20, 22],
  [0, 12, 19, 21, 3],
  [0, 18, 25, 2, 9],
];
// note down the output for use in the UI
console.log(JSON.stringify(puzzle));

let sentTx;
// compile the contract to create prover keys
console.log('compile the contract...');
await MagicSquaresZkApp.compile();
try {
  // init
  console.log(zkAppAddress);
  await fetchAccount({ publicKey: zkAppAddress });
  console.log('Is the puzzle solved?', zkApp.isSolved.get().toBoolean());
  console.log('update puzzle hash...');

  let tx = await Mina.transaction({ sender: feepayerAddress, fee }, () => {
    // zkApp.deploy(); should have been deployed earlier with `zk deploy`
    zkApp.update(PuzzleStruct.from(puzzle));
  });
  await tx.prove();
  sentTx = await tx.sign([zkAppKey, feepayerKey]).send();
} catch (err) {
  console.log(err);
}
if (sentTx?.hash() !== undefined) {
  console.log(`
  Success! Update transaction sent.
  
  Your smart contract state will be updated
  as soon as the transaction is included in a block:
  https://berkeley.minaexplorer.com/transaction/${sentTx?.hash()}
  `);
}
