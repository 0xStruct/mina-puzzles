import { QuizZkApp } from './Quiz';
import { PrivateKey, PublicKey, Mina, AccountUpdate, Poseidon, Field } from 'o1js';

describe('puzzle', () => {
  let zkApp: QuizZkApp,
    zkAppPrivateKey: PrivateKey,
    zkAppAddress: PublicKey,
    puzzle: number[][],
    sender: PublicKey,
    senderKey: PrivateKey;

  beforeEach(async () => {
    let Local = Mina.LocalBlockchain({ proofsEnabled: false });
    Mina.setActiveInstance(Local);
    sender = Local.testAccounts[0].publicKey;
    senderKey = Local.testAccounts[0].privateKey;
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new QuizZkApp(zkAppAddress);
    puzzle = [[]];
  });

  it('accepts a correct solution', async () => {
    await deploy(zkApp, zkAppPrivateKey, puzzle, sender, senderKey);

    await expect(async () => {
      let tx = await Mina.transaction(sender, () => {
        let zkApp = new QuizZkApp(zkAppAddress);
        zkApp.submitSolution(Field(1), Field(2), Field(3));
      });
      await tx.prove();
      await tx.sign([senderKey]).send();
    }).resolves;

  });

  it('rejects an incorrect solution', async () => {
    await deploy(zkApp, zkAppPrivateKey, puzzle, sender, senderKey);

    await expect(async () => {
      let tx = await Mina.transaction(sender, () => {
        let zkApp = new QuizZkApp(zkAppAddress);
        zkApp.submitSolution(Field(0), Field(0), Field(0));
      });
      await tx.prove();
      await tx.sign([senderKey]).send();
    }).rejects.toThrow(/wrong solution/);

  });
});

async function deploy(
  zkApp: QuizZkApp,
  zkAppPrivateKey: PrivateKey,
  puzzle: number[][],
  sender: PublicKey,
  senderKey: PrivateKey
) {
  let solutionHash = Poseidon.hash([Field(1), Field(2), Field(3)]);

  let tx = await Mina.transaction(sender, () => {
    AccountUpdate.fundNewAccount(sender);
    zkApp.deploy();
    zkApp.update(solutionHash);
  });
  await tx.prove();
  // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
  await tx.sign([zkAppPrivateKey, senderKey]).send();
}
