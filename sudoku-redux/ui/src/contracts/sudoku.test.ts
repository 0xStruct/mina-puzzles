import { Sudoku, SudokuZkApp } from './sudoku';
import { cloneSudoku, generateSudoku, solveSudoku } from './sudoku-lib';
import { PrivateKey, PublicKey, Mina, AccountUpdate, Field } from 'o1js';

describe('sudoku', () => {
  let zkApp: SudokuZkApp,
    zkAppPrivateKey: PrivateKey,
    zkAppAddress: PublicKey,
    sudokus: number[][][],
    sender: PublicKey,
    senderKey: PrivateKey;

  beforeEach(async () => {
    let Local = Mina.LocalBlockchain({ proofsEnabled: false });
    Mina.setActiveInstance(Local);
    sender = Local.testAccounts[0].publicKey;
    senderKey = Local.testAccounts[0].privateKey;
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new SudokuZkApp(zkAppAddress);
    sudokus = [generateSudoku(0.1), generateSudoku(0.2), generateSudoku(0.3), generateSudoku(0.4)];
  });

  it('accepts a correct solution', async () => {
    await deploy(zkApp, zkAppPrivateKey, sudokus, sender, senderKey);

    let solution = solveSudoku(sudokus[0]);
    if (solution === undefined) throw Error('cannot happen');
    let tx = await Mina.transaction(sender, () => {
      let zkApp = new SudokuZkApp(zkAppAddress);
      zkApp.submitSolution(Field(1), Sudoku.from(sudokus[0]), Sudoku.from(solution!));
    });
    await tx.prove();
    await tx.sign([senderKey]).send();
  });

  it('rejects an incorrect solution', async () => {
    await deploy(zkApp, zkAppPrivateKey, sudokus, sender, senderKey);

    let solution = solveSudoku(sudokus[0]);
    if (solution === undefined) throw Error('cannot happen');

    let noSolution = cloneSudoku(solution);
    noSolution[0][0] = (noSolution[0][0] % 9) + 1;

    await expect(async () => {
      let tx = await Mina.transaction(sender, () => {
        let zkApp = new SudokuZkApp(zkAppAddress);
        zkApp.submitSolution(Field(1), Sudoku.from(sudokus[0]), Sudoku.from(noSolution));
      });
      await tx.prove();
      await tx.sign([senderKey]).send();
    }).rejects.toThrow(/array contains the numbers 1...9/);
  });
});

async function deploy(
  zkApp: SudokuZkApp,
  zkAppPrivateKey: PrivateKey,
  sudokus: number[][][],
  sender: PublicKey,
  senderKey: PrivateKey
) {
  let tx = await Mina.transaction(sender, () => {
    AccountUpdate.fundNewAccount(sender);
    zkApp.deploy();
    zkApp.update(Sudoku.from(sudokus[0]), Sudoku.from(sudokus[1]), Sudoku.from(sudokus[2]), Sudoku.from(sudokus[3]));
  });
  await tx.prove();
  // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
  await tx.sign([zkAppPrivateKey, senderKey]).send();
}
