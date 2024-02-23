import {
  Cache,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  UInt32,
  Field,
  Poseidon,
} from "o1js";
import { TictactoeProveValidator } from "./TictactoeProveValidator";
import { TictactoeProve } from "./TictactoeProve";

let proofsEnabled = true;

describe("TictactoeProveValidator", () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    accounts: { publicKey: PublicKey; privateKey: PrivateKey }[],
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: TictactoeProveValidator;

  const player1Secret = Field(256);
  const player2Secret = Field(512);
  const gameId = Field(1);

  let baseProof: any, move1Proof: any, move2Proof: any;

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
    console.time("compile-TictactoeProve");
    await TictactoeProve.compile({ cache });
    console.timeEnd("compile-TictactoeProve");

    console.time("compile-TictactoeProveValidator");
    if (proofsEnabled) await TictactoeProveValidator.compile();
    console.timeEnd("compile-TictactoeProveValidator");

    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    accounts = Local.testAccounts.slice(1);
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new TictactoeProveValidator(zkAppAddress);

    // baseProof
    baseProof = await TictactoeProve.start(
      Poseidon.hash([player1Secret]),
      Poseidon.hash([player2Secret]),
      gameId
    );

    await localDeploy();
  });

  it("check initial value of gameCount", async () => {
    expect(zkApp.gameCount.get()).toEqual(UInt32.zero);
  });

  it("make 2 moves and try to validate, should not work", async () => {
    move1Proof = await TictactoeProve.move(
      player1Secret,
      Field(0),
      Field(0),
      baseProof
    );

    move2Proof = await TictactoeProve.move(
      player2Secret,
      Field(0),
      Field(1),
      move1Proof
    );

    let gameCount = zkApp.gameCount.get();
    expect(zkApp.gameCount.get()).toEqual(gameCount);
  });

  it("continue making moves till P1 wins, P2 loses", async () => {
    let gameCount = zkApp.gameCount.get();

    let move3Proof = await TictactoeProve.move(
      player1Secret,
      Field(1),
      Field(1),
      move2Proof
    );

    let move4Proof = await TictactoeProve.move(
      player2Secret,
      Field(0),
      Field(2),
      move3Proof
    );

    let move5Proof = await TictactoeProve.move(
      player1Secret,
      Field(2),
      Field(2),
      move4Proof
    );

    const account = accounts[0];
    let txn = await Mina.transaction(account.publicKey, () => {
      zkApp.validate(move5Proof);
    });
    await txn.prove();
    await txn.sign([account.privateKey]).send();

    expect(zkApp.gameCount.get()).toEqual(gameCount.add(1));

    // log local events
    let events = await zkApp.fetchEvents();
    console.log("last event's data", events[events.length - 1].event.data);
  });
});
