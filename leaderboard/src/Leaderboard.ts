/*
This contract utilize MerkleMap to create points tracker (leaderboard) for game players
method `addPoint` can be called with signature by an admin, to prevent cheating
*/
import {
  SmartContract,
  Poseidon,
  Field,
  State,
  state,
  PublicKey,
  method,
  UInt32,
  MerkleMap,
  MerkleMapWitness,
  Struct,
  Signature,
} from 'o1js';

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

export class Leaderboard extends SmartContract {
  @state(Field) boardMapRoot = State<Field>();
  @state(PublicKey) adminPublicKey = State<PublicKey>();
  @state(PublicKey) serverPublicKey = State<PublicKey>();

  @method init() {
    super.init();

    const emptyMapRoot = new MerkleMap().getRoot();
    this.boardMapRoot.set(emptyMapRoot);
    this.adminPublicKey.set(PublicKey.empty());
    this.serverPublicKey.set(PublicKey.empty());
  }

  @method setAdminPublicKey(adminPublicKey: PublicKey) {
    // only allow if empty
    this.adminPublicKey.getAndAssertEquals().assertEquals(PublicKey.empty());

    this.adminPublicKey.set(adminPublicKey);
  }

  @method setServerPublicKey(serverPublicKey: PublicKey) {
    // only allow if empty
    this.serverPublicKey.getAndAssertEquals().assertEquals(PublicKey.empty());

    this.serverPublicKey.set(serverPublicKey);
  }

  @method addPoint(
    adminSignature: Signature,
    playerKey: Field,
    playerValue: Field,
    player: Player,
    witness: MerkleMapWitness
  ) {
    // verify signature is by the adminPublicKey
    // points can be add by admin
    const adminPublicKey = this.adminPublicKey.getAndAssertEquals();
    adminSignature.verify(adminPublicKey, [playerKey]).assertTrue();

    // we fetch the on-chain boardMapRoot
    let boardMapRoot = this.boardMapRoot.getAndAssertEquals();

    // check the initial state matches what we expect
    const [rootBefore, key] = witness.computeRootAndKey(playerValue);
    rootBefore.assertEquals(boardMapRoot);

    key.assertEquals(playerKey);

    // compute the new root after new value
    let updatedPlayer = player.addPoints(1); // add one point
    const [rootAfter, _] = witness.computeRootAndKey(updatedPlayer.hash());

    // set the new root
    this.boardMapRoot.set(rootAfter);
  }
}


