import { MagicSquaresZkApp, PuzzleStruct } from './MagicSquares';
import { PrivateKey, PublicKey, Mina, AccountUpdate, Field } from 'o1js';

describe('puzzle', () => {
  let zkApp: MagicSquaresZkApp,
    zkAppPrivateKey: PrivateKey,
    zkAppAddress: PublicKey,
    puzzle: number[][],
    puzzles: number[][][],
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
    ];
    puzzles = [puzzle, puzzle, puzzle, puzzle];
  });

  it('accepts a correct solution', async () => {
    await deploy(zkApp, zkAppPrivateKey, puzzles, sender, senderKey);

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
        Field(1),
        PuzzleStruct.from(puzzle),
        PuzzleStruct.from(solution!)
      );
    });
    await tx.prove();
    await tx.sign([senderKey]).send();

  });

  it('rejects an incorrect solution', async () => {
    await deploy(zkApp, zkAppPrivateKey, puzzles, sender, senderKey);

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
        zkApp.submitSolution(Field(1), PuzzleStruct.from(puzzle), PuzzleStruct.from(noSolution));
      });
      await tx.prove();
      await tx.sign([senderKey]).send();
    }).rejects.toThrow(/unequal sums/);

  });
});

async function deploy(
  zkApp: MagicSquaresZkApp,
  zkAppPrivateKey: PrivateKey,
  puzzles: number[][][],
  sender: PublicKey,
  senderKey: PrivateKey
) {
  let tx = await Mina.transaction(sender, () => {
    AccountUpdate.fundNewAccount(sender);
    zkApp.deploy();
    zkApp.update(PuzzleStruct.from(puzzles[0]), PuzzleStruct.from(puzzles[1]), PuzzleStruct.from(puzzles[2]), PuzzleStruct.from(puzzles[3]));
  });
  await tx.prove();
  // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
  await tx.sign([zkAppPrivateKey, senderKey]).send();
}
