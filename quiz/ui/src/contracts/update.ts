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
import { Mina, PrivateKey, fetchAccount, Poseidon, Field} from 'o1js';
import fs from 'fs/promises';
import { QuizZkApp } from './Quiz.js';

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
let zkApp = new QuizZkApp(zkAppAddress);

const solutionHash = Poseidon.hash([Field(1), Field(2), Field(3)]);

let sentTx;
// compile the contract to create prover keys
console.log('compile the contract...');
await QuizZkApp.compile();
try {
  // init
  console.log(zkAppAddress);
  await fetchAccount({ publicKey: zkAppAddress });
  console.log('update solution hash...');

  let tx = await Mina.transaction({ sender: feepayerAddress, fee }, () => {
    // zkApp.deploy(); should have been deployed earlier with `zk deploy`
    zkApp.update(solutionHash);
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
