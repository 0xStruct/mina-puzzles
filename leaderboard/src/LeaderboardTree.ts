/*
This contract utilize Merkle Tree to create points tracker (leaderboard) for game players
method `addPoint` can be called with signature by an admin, to prevent cheating
*/
import {
  SmartContract,
  Poseidon,
  Bool,
  Field,
  State,
  state,
  PublicKey,
  method,
  UInt32,
  MerkleTree,
  Struct,
  Signature,
  DeployArgs,
  Permissions,
} from 'o1js';

import {
  OffChainStorage,
  MerkleWitness8,
} from 'experimental-zkapp-offchain-storage-punkpoll';

export class Player extends Struct({
  publicKey: PublicKey,
  points: UInt32,
}) {
  hash(): Field {
    return Poseidon.hash(Player.toFields(this));
  }

  addPoints(points: number) {
    return new Player({
      publicKey: this.publicKey,
      points: this.points.add(points),
    });
  }
}

export class LeaderboardTree extends SmartContract {
  @state(Field) boardTreeRoot = State<Field>();
  @state(PublicKey) adminPublicKey = State<PublicKey>();

  @state(PublicKey) storageServerPublicKey = State<PublicKey>();
  @state(Field) storageTreeRoot = State<Field>();
  @state(Field) storageNumber = State<Field>();

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.account.permissions.set({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
  }

  @method init() {
    super.init();

    const emptyTreeRoot = new MerkleTree(8).getRoot();
    this.boardTreeRoot.set(emptyTreeRoot);
    this.storageTreeRoot.set(emptyTreeRoot);

    this.adminPublicKey.set(PublicKey.empty());
    this.storageServerPublicKey.set(PublicKey.empty());

    this.storageNumber.set(Field(0));
  }

  @method initState(storageServerPublicKey: PublicKey) {
    this.storageServerPublicKey.set(storageServerPublicKey);
    this.storageNumber.set(Field(0));

    const emptyTreeRoot = new MerkleTree(8).getRoot();
    this.storageTreeRoot.set(emptyTreeRoot);
  }

  @method setAdminPublicKey(adminPublicKey: PublicKey) {
    // only allow if empty
    this.adminPublicKey.getAndAssertEquals().assertEquals(PublicKey.empty());

    this.adminPublicKey.set(adminPublicKey);
  }

  @method setStorageServerPublicKey(storageServerPublicKey: PublicKey) {
    // only allow if empty
    this.storageServerPublicKey.getAndAssertEquals().assertEquals(PublicKey.empty());

    this.storageServerPublicKey.set(storageServerPublicKey);
  }

  @method addPoint(
    adminSignature: Signature,
    playerKey: Field,
    playerValue: Field,
    player: Player,
    witness: MerkleWitness8
  ) {
    // verify signature is by the adminPublicKey
    // points can be add by admin
    const adminPublicKey = this.adminPublicKey.getAndAssertEquals();
    adminSignature.verify(adminPublicKey, [playerKey]).assertTrue();

    // we fetch the on-chain boardTreeRoot
    let boardTreeRoot = this.boardTreeRoot.getAndAssertEquals();

    // check the initial state matches what we expect
    witness.calculateRoot(player.hash()).assertEquals(boardTreeRoot);

    // compute the new root after new value
    let updatedPlayer = player.addPoints(1); // add one point
    const rootAfter = witness.calculateRoot(updatedPlayer.hash());

    // set the new root
    this.boardTreeRoot.set(rootAfter);
  }

  @method update(
    leafIsEmpty: Bool,
    oldHash: Field,
    newHash: Field,
    witness: MerkleWitness8,
    storedNewRootNumber: Field,
    storedNewRootSignature: Signature
  ) {
    const storedRoot = this.storageTreeRoot.getAndAssertEquals();

    let storedNumber = this.storageNumber.getAndAssertEquals();

    let storageServerPublicKey = this.storageServerPublicKey.getAndAssertEquals();

    let leaf = [oldHash];
    let newLeaf = [newHash];

    // newLeaf can be a function of the existing leaf
    newLeaf[0].assertGreaterThan(leaf[0]);

    const updates = [
      {
        leaf,
        leafIsEmpty,
        newLeaf,
        newLeafIsEmpty: Bool(false),
        leafWitness: witness,
      },
    ];

    const storedNewRoot = OffChainStorage.assertRootUpdateValid(
      storageServerPublicKey,
      storedNumber,
      storedRoot,
      updates,
      storedNewRootNumber,
      storedNewRootSignature
    );

    this.storageTreeRoot.set(storedNewRoot);
    this.storageNumber.set(storedNewRootNumber);
  }
}
