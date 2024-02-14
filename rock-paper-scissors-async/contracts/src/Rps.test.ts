import { Rps } from "./Rps";
import {
  Field,
  Bool,
  PrivateKey,
  PublicKey,
  Mina,
  AccountUpdate,
  Signature,
  Poseidon,
  ZkProgram,
} from "o1js";

describe("rockpaperscissors", () => {
  let player1: PublicKey,
    player1Key: PrivateKey,
    player1Secret: Field,
    player2: PublicKey,
    player2Key: PrivateKey,
    player2Secret: Field,
    gameId: Field,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: Rps;

  beforeAll(async () => {
    let Local = Mina.LocalBlockchain({ proofsEnabled: false });
    Mina.setActiveInstance(Local);
    [
      { publicKey: player1, privateKey: player1Key },
      { publicKey: player2, privateKey: player2Key },
    ] = Local.testAccounts;
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();

    gameId = Field(101010);
    player1Secret = Field(111);
    player2Secret = Field(222);

    zkApp = new Rps(zkAppAddress);

    // deploy and start game
    const txn = await Mina.transaction(player1, () => {
      AccountUpdate.fundNewAccount(player1);
      zkApp.deploy();
      zkApp.startGame(player1, player2, gameId);
    });
    await txn.prove();
    await txn.sign([zkAppPrivateKey, player1Key]).send();
  });

  it("p1 makes a correct choice", async () => {
    const [choice, secret] = [Field(1), player1Secret];
    const signature = Signature.create(player1Key, [choice, secret, gameId]);
    const txn = await Mina.transaction(player1, () => {
      zkApp.makeChoice(player1, signature, choice, secret);
    });
    await txn.prove();
    await txn.sign([player1Key]).send();

    // check
    expect(zkApp.p1HashedRevealedChoice.get()).toEqual(
      Poseidon.hash([choice, secret, gameId])
    );
  });

  it("p1 makes a incorrect choice, rejects", async () => {
    await expect(async () => {
      const [choice, secret] = [Field(5), player1Secret];
      const signature = Signature.create(player1Key, [choice, secret, gameId]);
      const txn = await Mina.transaction(player1, () => {
        zkApp.makeChoice(player1, signature, choice, secret);
      });
      await txn.prove();
      await txn.sign([player1Key]).send();
    }).rejects.toThrow(/only 1,2,3/);
  });

  it("p1 reveals the choice, should not work as p2 has not made a choice yet", async () => {
    await expect(async () => {
      const signature = Signature.create(player1Key, [player1Secret, gameId]);
      const txn = await Mina.transaction(player1, () => {
        zkApp.revealChoice(player1, signature, player1Secret);
      });
      await txn.prove();
      await txn.sign([player1Key]).send();
    }).rejects.toThrow(/cannot reveal yet/);
  });

  it("p2 tries to reveal the choice - cannot as p2 has not made a choice yet", async () => {
    await expect(async () => {
      const signature = Signature.create(player2Key, [player2Secret, gameId]);
      const txn = await Mina.transaction(player2, () => {
        zkApp.revealChoice(player2, signature, player2Secret);
      });
      await txn.prove();
      await txn.sign([player2Key]).send();
    }).rejects.toThrow();
  });

  it("p2 makes a choice", async () => {
    const [choice, secret] = [Field(2), player2Secret];
    let signature = Signature.create(player2Key, [choice, secret, gameId]);
    let txn = await Mina.transaction(player2, async () => {
      zkApp.makeChoice(player2, signature, choice, secret);
    });
    await txn.prove();
    await txn.sign([player2Key]).send();

    // check
    expect(zkApp.p2HashedRevealedChoice.get()).toEqual(
      Poseidon.hash([choice, secret, gameId])
    );
  });

  it("p2 reveals the choice", async () => {
    let signature = Signature.create(player2Key, [player2Secret, gameId]);
    let txn = await Mina.transaction(player2, () => {
      zkApp.revealChoice(player2, signature, player2Secret);
    });
    await txn.prove();
    await txn.sign([player2Key]).send();

    // check
    expect(zkApp.p2HashedRevealedChoice.get()).toEqual(Field(2));
  });

  it("p1 reveals the choice, should works now as p2 has made a choice", async () => {
    const signature = Signature.create(player1Key, [player1Secret, gameId]);
    const txn = await Mina.transaction(player1, () => {
      zkApp.revealChoice(player1, signature, player1Secret);
    });
    await txn.prove();
    await txn.sign([player1Key]).send();

    // check
    expect(zkApp.p1HashedRevealedChoice.get()).toEqual(Field(1));
  });
});
