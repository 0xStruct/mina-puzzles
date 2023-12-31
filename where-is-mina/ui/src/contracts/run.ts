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
import { WhereZkApp } from './Where.js';
import { AccountUpdate, Mina, Poseidon, Field, PrivateKey } from 'o1js';

// setup
const Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

const { privateKey: senderKey, publicKey: sender } = Local.testAccounts[0];
const solutionHash = Poseidon.hash([Field(1), Field(2)]);
const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();
// create an instance of the smart contract
const zkApp = new WhereZkApp(zkAppAddress);

console.log('Deploying and initializing Where Is Mina...');
await WhereZkApp.compile();
let tx = await Mina.transaction(sender, () => {
  AccountUpdate.fundNewAccount(sender);
  zkApp.deploy();
  zkApp.update(solutionHash);
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

// submit a wrong solution
console.log('Submitting wrong solution...');
try {
  let tx = await Mina.transaction(sender, () => {
    zkApp.submitSolution(Field(0), Field(0));
  });
  await tx.prove();
  await tx.sign([senderKey]).send();
} catch {
  console.log('There was an error submitting the solution, as expected');
}

// submit the actual solution
console.log('Submitting solution...');
tx = await Mina.transaction(sender, () => {
  zkApp.submitSolution(Field(1), Field(2));
});
await tx.prove();
await tx.sign([senderKey]).send();
