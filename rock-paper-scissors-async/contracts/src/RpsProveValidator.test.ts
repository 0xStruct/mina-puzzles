import {
  Cache,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  UInt32,
  Field,
} from "o1js";
import { RpsProveValidator } from "./RpsProveValidator";
import { RpsProve } from "./RpsProve";

let proofsEnabled = true;

describe("RpsProveValidator", () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    accounts: { publicKey: PublicKey; privateKey: PrivateKey }[],
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: RpsProveValidator;

  const p1Secret = Field(256);
  const p2Secret = Field(512);
  const gameId = Field(1);

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
    });
    await txn.prove();
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  beforeAll(async () => {
    const cache: Cache = Cache.FileSystem("./cache");
    console.log("compiling ...");
    console.time("compile-RpsProve");
    await RpsProve.compile({ cache });
    console.timeEnd("compile-RpsProve");

    console.time("compile-RpsProveValidator");
    if (proofsEnabled) await RpsProveValidator.compile();
    console.timeEnd("compile-RpsProveValidator");

    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    accounts = Local.testAccounts.slice(1);
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new RpsProveValidator(zkAppAddress);

    await localDeploy();
  });

  it("check initial value of gameCount", async () => {
    expect(zkApp.gameCount.get()).toEqual(UInt32.zero);
  });

  it("play a draw game", async () => {
    let gameCount = zkApp.gameCount.get();
    let drawCount = zkApp.gameCount.get();
    
    let p1ChoiceProof = await RpsProve.choice(
      Field(1), // choice: 1 rock, 2 paper, 3 scissors
      p1Secret, // secret
      gameId
    );

    let p2ChoiceProof = await RpsProve.choice(
      Field(1), // choice: 1 rock, 2 paper, 3 scissors
      p2Secret, // secret
      gameId
    );

    let p1RevealProof = await RpsProve.reveal(
      p1ChoiceProof.publicOutput.hashedChoice,
      p1Secret,
      gameId
    );

    let p2RevealProof = await RpsProve.reveal(
      p2ChoiceProof.publicOutput.hashedChoice,
      p2Secret,
      gameId
    );

    const account = accounts[0];
    let txn = await Mina.transaction(account.publicKey, () => {
      zkApp.validate(p1RevealProof, p2RevealProof);
    });
    await txn.prove();
    await txn.sign([account.privateKey]).send();

    expect(zkApp.gameCount.get()).toEqual(gameCount.add(1));
    expect(zkApp.drawCount.get()).toEqual(drawCount.add(1));

    // log local events
    let events = await zkApp.fetchEvents();
    console.log("last event's data", events[events.length - 1].event.data);
  });

  it("P1 is rock, P2 is paper, P2 wins", async () => {
    let gameCount = zkApp.gameCount.get();
    let drawCount = zkApp.gameCount.get();

    let p1ChoiceProof = await RpsProve.choice(
      Field(1), // choice: 1 rock, 2 paper, 3 scissors
      p1Secret, // secret
      gameId
    );

    let p2ChoiceProof = await RpsProve.choice(
      Field(2), // choice: 1 rock, 2 paper, 3 scissors
      p2Secret, // secret
      gameId
    );

    let p1RevealProof = await RpsProve.reveal(
      p1ChoiceProof.publicOutput.hashedChoice,
      p1Secret,
      gameId
    );

    let p2RevealProof = await RpsProve.reveal(
      p2ChoiceProof.publicOutput.hashedChoice,
      p2Secret,
      gameId
    );

    console.log("now passing the proofs to the validator on contract side");

    const account = accounts[0];
    let txn = await Mina.transaction(account.publicKey, () => {
      zkApp.validate(p1RevealProof, p2RevealProof);
    });
    await txn.prove();
    await txn.sign([account.privateKey]).send();

    expect(zkApp.gameCount.get()).toEqual(gameCount.add(1));
    expect(zkApp.drawCount.get()).toEqual(drawCount);

    // log local events
    let events = await zkApp.fetchEvents();
    console.log("last event's data", events[events.length - 1].event.data);
  });

  it("proof with different gameId, should not work", async () => {
    let p1ChoiceProof = await RpsProve.choice(
      Field(1), // choice: 1 rock, 2 paper, 3 scissors
      p1Secret, // secret
      gameId
    );

    let p2ChoiceProof = await RpsProve.choice(
      Field(1), // choice: 1 rock, 2 paper, 3 scissors
      p2Secret, // secret
      Field(100)
    );

    let p1RevealProof = await RpsProve.reveal(
      p1ChoiceProof.publicOutput.hashedChoice,
      p1Secret,
      gameId
    );

    let p2RevealProof = await RpsProve.reveal(
      p2ChoiceProof.publicOutput.hashedChoice,
      p2Secret,
      Field(100)
    );

    await expect(async () => {
      const account = accounts[0];
      let txn = await Mina.transaction(account.publicKey, () => {
        zkApp.validate(p1RevealProof, p2RevealProof);
      });
      await txn.prove();
      await txn.sign([account.privateKey]).send();
    }).rejects.toThrow();
  });
});
