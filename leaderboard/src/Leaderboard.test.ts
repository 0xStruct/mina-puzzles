import { Leaderboard, Player } from './Leaderboard';
import {
  Field,
  Bool,
  UInt32,
  PrivateKey,
  PublicKey,
  Mina,
  AccountUpdate,
  Signature,
  MerkleMap,
} from 'o1js';

describe('leaderboard', () => {
  const doProofs = false;

  let Local = Mina.LocalBlockchain({ proofsEnabled: doProofs });
  let zkAppPrivateKey = PrivateKey.random();
  let zkAppAddress = zkAppPrivateKey.toPublicKey();
  let feePayerKey = Local.testAccounts[0].privateKey;
  let feePayer = Local.testAccounts[0].publicKey;

  let zkApp: Leaderboard;

  type Names = 'Alice' | 'Bob' | 'Charlie' | 'David';

  // this map serves as our off-chain in-memory storage
  let Players: Map<string, Player> = new Map<Names, Player>(
    ['Alice', 'Bob', 'Charlie', 'David'].map((name: string, index: number) => {
      return [
        name as Names,
        new Player({
          publicKey: Local.testAccounts[index].publicKey,
          points: UInt32.from(0),
        }),
      ];
    })
  );

  // we initialize a new Merkle Map
  const boardMap = new MerkleMap(); // empty map
  // boardMap.set(Field(1), Players.get('Alice')!.hash());
  // boardMap.set(Field(2), Players.get('Bob')!.hash());
  // boardMap.set(Field(3), Players.get('Charlie')!.hash());
  // boardMap.set(Field(4), Players.get('David')!.hash());

  async function doAddPointTx(name: Names, key: Field) {
    let player = Players.get(name)!;
    let witness = boardMap.getWitness(key);
    let value = boardMap.get(key);

    let adminSignature = Signature.create(feePayerKey, [key]);

    let tx = await Mina.transaction(feePayer, () => {
      zkApp.addPoint(adminSignature, key, value, player, witness);
    });
    await tx.prove();
    await tx.sign([feePayerKey, zkAppPrivateKey]).send();

    // if the transaction was successful, update the off-chain storage as well
    player.points = player.points.add(1);
    boardMap.set(key, player.hash());
    zkApp.boardMapRoot.get().assertEquals(boardMap.getRoot());
  }

  beforeAll(async () => {
    Mina.setActiveInstance(Local);
    let initialBalance = 10_000_000_000;

    zkApp = new Leaderboard(zkAppAddress);
    console.log('Deploying leaderboard..');
    console.time('compile');
    if (doProofs) await Leaderboard.compile();
    console.timeEnd('compile');

    let tx = await Mina.transaction(feePayer, () => {
      AccountUpdate.fundNewAccount(feePayer).send({
        to: zkAppAddress,
        amount: initialBalance,
      });
      zkApp.deploy();
    });
    await tx.prove();
    await tx.sign([feePayerKey, zkAppPrivateKey]).send();

    expect(zkApp.adminPublicKey.get()).toEqual(PublicKey.empty());
  });

  it('set adminPublicKey once and for all', async () => {
    const txn = await Mina.transaction(feePayer, () => {
      zkApp.setAdminPublicKey(feePayer);
    });
    await txn.prove();
    await txn.sign([feePayerKey, zkAppPrivateKey]).send();

    expect(zkApp.adminPublicKey.get()).toEqual(feePayer);
  });

  it('add points for Alice and Bob', async () => {
    await doAddPointTx('Alice', Field(1));
    await doAddPointTx('Alice', Field(1));
    await doAddPointTx('Bob', Field(2));

    expect(Players.get("Alice")!.points).toEqual(UInt32.from(2));
    expect(Players.get("Bob")!.points).toEqual(UInt32.from(1));
  });

  it('add points for Charlie with an invalid signature', async () => {
    await expect(async () => {
      let player = Players.get('Charlie')!;
      let key = Field(3);
      let witness = boardMap.getWitness(key);
      let value = boardMap.get(key);

      let invalidSignature = Signature.create(
        Local.testAccounts[5].privateKey,
        [key]
      );

      let tx = await Mina.transaction(feePayer, () => {
        zkApp.addPoint(invalidSignature, key, value, player, witness);
      });
      await tx.prove();
      await tx.sign([feePayerKey, zkAppPrivateKey]).send();
    }).rejects.toThrow();
  });
});
