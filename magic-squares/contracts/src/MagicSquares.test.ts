import { MagicSquaresZkApp, PuzzleStruct } from './MagicSquares';
import { PrivateKey, PublicKey, Mina, AccountUpdate } from 'o1js';

describe('puzzle', () => {
  let zkApp: MagicSquaresZkApp,
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
    zkApp = new MagicSquaresZkApp(zkAppAddress);
    puzzle = [
      [0, 24, 1, 8, 0],
      [23, 0, 7, 0, 16],
      [4, 6, 0, 20, 22],
      [10, 0, 19, 0, 3],
      [0, 18, 25, 2, 0],
    ]
  });

  it('accepts a correct solution', async () => {
    await deploy(zkApp, zkAppPrivateKey, puzzle, sender, senderKey);

    let isSolved = zkApp.isSolved.get().toBoolean();
    expect(isSolved).toBe(false);

    let solution = [
      [17, 24, 1, 8, 15],
      [23, 5, 7, 14, 16],
      [4, 6, 13, 20, 22],
      [10, 12, 19, 21, 3],
      [11, 18, 25, 2, 9],
    ];
    if (solution === undefined) throw Error('cannot happen');

    let tx = await Mina.transaction(sender, () => {
      let zkApp = new MagicSquaresZkApp(zkAppAddress);
      zkApp.submitSolution(
        PuzzleStruct.from(puzzle),
        PuzzleStruct.from(solution!)
      );
    });
    await tx.prove();
    await tx.sign([senderKey]).send();

    isSolved = zkApp.isSolved.get().toBoolean();
    expect(isSolved).toBe(true);
  });

  it('rejects an incorrect solution', async () => {
    await deploy(zkApp, zkAppPrivateKey, puzzle, sender, senderKey);

    let noSolution = [
      [1, 24, 1, 8, 1],
      [23, 1, 7, 1, 16],
      [4, 6, 1, 20, 22],
      [10, 1, 19, 1, 3],
      [1, 18, 25, 2, 1],
    ];
    if (noSolution === undefined) throw Error('cannot happen');

    await expect(async () => {
      let tx = await Mina.transaction(sender, () => {
        let zkApp = new MagicSquaresZkApp(zkAppAddress);
        zkApp.submitSolution(PuzzleStruct.from(puzzle), PuzzleStruct.from(noSolution));
      });
      await tx.prove();
      await tx.sign([senderKey]).send();
    }).rejects.toThrow(/unequal sums/);

    let isSolved = zkApp.isSolved.get().toBoolean();
    expect(isSolved).toBe(false);
  });
});

async function deploy(
  zkApp: MagicSquaresZkApp,
  zkAppPrivateKey: PrivateKey,
  puzzle: number[][],
  sender: PublicKey,
  senderKey: PrivateKey
) {
  let tx = await Mina.transaction(sender, () => {
    AccountUpdate.fundNewAccount(sender);
    zkApp.deploy();
    zkApp.update(PuzzleStruct.from(puzzle));
  });
  await tx.prove();
  // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
  await tx.sign([zkAppPrivateKey, senderKey]).send();
}
