/**
 * This file specifies how to run the `MagicSquaresZkApp` smart contract locally using the `Mina.LocalBlockchain()` method.
 * The `Mina.LocalBlockchain()` method specifies a ledger of accounts and contains logic for updating the ledger.
 *
 * Please note that this deployment is local and does not deploy to a live network.
 * If you wish to deploy to a live network, please use the zkapp-cli to deploy.
 *
 * To run locally:
 * Build the project: `$ npm run build`
 * Run with node:     `$ node build/src/run.js`.
 */
import { MagicSquaresZkApp, PuzzleStruct } from './MagicSquares.js';
import { AccountUpdate, Mina, PrivateKey } from 'o1js';

// setup
const Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

const { privateKey: senderKey, publicKey: sender } = Local.testAccounts[0];
const puzzle = [
  [0, 24, 1, 8, 15],
  [0, 5, 7, 14, 16],
  [0, 6, 13, 20, 22],
  [0, 12, 19, 21, 3],
  [0, 18, 25, 2, 9],
];
const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();
// create an instance of the smart contract
const zkApp = new MagicSquaresZkApp(zkAppAddress);

console.log('Deploying and initializing Magic Squares...');
await MagicSquaresZkApp.compile();
let tx = await Mina.transaction(sender, () => {
  AccountUpdate.fundNewAccount(sender);
  zkApp.deploy();
  zkApp.update(PuzzleStruct.from(puzzle));
});
await tx.prove();
/**
 * note: this tx needs to be signed with `tx.sign()`, because `deploy` uses `requireSignature()` under the hood,
 * so one of the account updates in this tx has to be authorized with a signature (vs proof).
 * this is necessary for the deploy tx because the initial permissions for all account fields are "signature".
 * (but `deploy()` changes some of those permissions to "proof" and adds the verification key that enables proofs.
 * that's why we don't need `tx.sign()` for the later transactions.)
 */
await tx.sign([zkAppPrivateKey, senderKey]).send();

console.log('Is the puzzle solved?', zkApp.isSolved.get().toBoolean());

let solution = [
  [17, 24, 1, 8, 15],
  [23, 5, 7, 14, 16],
  [4, 6, 13, 20, 22],
  [10, 12, 19, 21, 3],
  [11, 18, 25, 2, 9],
];
if (solution === undefined) throw Error('cannot happen');

// submit a wrong solution
let noSolution = [
  [1, 24, 1, 8, 15],
  [1, 5, 7, 14, 16],
  [1, 6, 13, 20, 22],
  [1, 12, 19, 21, 3],
  [1, 18, 25, 2, 9],
];

console.log('Submitting wrong solution...');
try {
  let tx = await Mina.transaction(sender, () => {
    zkApp.submitSolution(PuzzleStruct.from(puzzle), PuzzleStruct.from(noSolution));
  });
  await tx.prove();
  await tx.sign([senderKey]).send();
} catch {
  console.log('There was an error submitting the solution, as expected');
}

console.log('Is the puzzle solved?', zkApp.isSolved.get().toBoolean());

// submit the actual solution
console.log('Submitting solution...');
tx = await Mina.transaction(sender, () => {
  zkApp.submitSolution(PuzzleStruct.from(puzzle), PuzzleStruct.from(solution!));
});
await tx.prove();
await tx.sign([senderKey]).send();

console.log('Is the puzzle solved?', zkApp.isSolved.get().toBoolean());
