import { Tictactoe } from './Tictactoe';
import {
  Field,
  Bool,
  PrivateKey,
  PublicKey,
  Mina,
  AccountUpdate,
  Signature,
} from 'o1js';

describe('tictactoe', () => {
  let player1: PublicKey,
    player1Key: PrivateKey,
    player2: PublicKey,
    player2Key: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey;

  beforeEach(async () => {
    let Local = Mina.LocalBlockchain({ proofsEnabled: false });
    Mina.setActiveInstance(Local);
    [{ publicKey: player1, privateKey: player1Key }, { publicKey: player2, privateKey: player2Key }] =
      Local.testAccounts;
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
  });

  it('generates and deploys tictactoe', async () => {
    const zkApp = new Tictactoe(zkAppAddress);
    const txn = await Mina.transaction(player1, () => {
      AccountUpdate.fundNewAccount(player1);
      zkApp.deploy();
      zkApp.startGame(player1, Field(777));
    });
    await txn.prove();
    await txn.sign([zkAppPrivateKey, player1Key]).send();
    const board = zkApp.board.get();
    expect(board).toEqual(Field(0));
  });

  it('player2 joins (should work), player1 joins again (should not work)', async () => {
    const zkApp = new Tictactoe(zkAppAddress);
    
    let txn = await Mina.transaction(player1, () => {
      AccountUpdate.fundNewAccount(player1);
      zkApp.deploy();
      zkApp.startGame(player1, Field(777));
    });
    await txn.prove();
    await txn.sign([zkAppPrivateKey, player1Key]).send();
    const board = zkApp.board.get();
    expect(board).toEqual(Field(0));

    txn = await Mina.transaction(player2, () => {
      zkApp.joinGame(player2);
    });
    await txn.prove();
    await txn.sign([player2Key]).send();
    const _player2 = zkApp.player2.get();
    expect(_player2).toEqual(player2);

    // join again by player1 - should not work
    await expect(async () => {
      txn = await Mina.transaction(player1, () => {
        zkApp.joinGame(player1);
      });
      await txn.prove();
      await txn.sign([player1Key]).send();
    }).rejects.toThrow();
  });
  

  it('deploys tictactoe & accepts a correct move', async () => {
    const zkApp = new Tictactoe(zkAppAddress);

    // deploy and startGame
    let txn = await Mina.transaction(player1, () => {
      AccountUpdate.fundNewAccount(player1);
      zkApp.deploy();
      zkApp.startGame(player1, Field(777));
    });
    await txn.prove();
    await txn.sign([zkAppPrivateKey, player1Key]).send();

    // player2 joins - joinGame
    txn = await Mina.transaction(player2, () => {
      zkApp.joinGame(player2);
    });
    await txn.prove();
    await txn.sign([player2Key]).send();
    const _player2 = zkApp.player2.getAndRequireEquals();
    expect(_player2).toEqual(player2);

    // move
    const [x, y] = [Field(0), Field(0)];
    const signature = Signature.create(player1Key, [x, y]);
    txn = await Mina.transaction(player1, async () => {
      zkApp.play(player1, signature, x, y);
    });
    await txn.prove();
    await txn.sign([player1Key]).send();

    // check next player
    let isNextPlayer1 = zkApp.nextIsPlayer1.get();
    expect(isNextPlayer1).toEqual(Bool(false));
  });

  it('deploy then reset the game', async () => {
    const zkApp = new Tictactoe(zkAppAddress);

    let txn = await Mina.transaction(player1, () => {
      AccountUpdate.fundNewAccount(player1);
      zkApp.deploy();
      zkApp.startGame(player1, Field(777));
    });
    await txn.prove();
    await txn.sign([zkAppPrivateKey, player1Key]).send();
    const board = zkApp.board.get();
    expect(board).toEqual(Field(0));
    let _player1 = zkApp.player1.get();
    expect(_player1).toEqual(player1);

    txn = await Mina.transaction(player1, () => {
      zkApp.resetGame();
    });
    await txn.prove();
    await txn.sign([player1Key]).send();
    _player1 = zkApp.player1.get();
    expect(_player1).toEqual(PublicKey.empty());
  });
});
