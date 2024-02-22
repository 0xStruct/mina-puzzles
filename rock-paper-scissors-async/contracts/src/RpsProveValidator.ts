import {
  SmartContract,
  state,
  UInt32,
  Field,
  State,
  method,
  Provable,
  provablePure,
} from "o1js";
import { RpsProveProof } from "./RpsProve";

export class RpsProveValidator extends SmartContract {
  @state(UInt32) gameCount = State<UInt32>(); // just count how many games have been player
  @state(UInt32) drawCount = State<UInt32>(); // keep track of draws

  // contract events
  events = {
    gameDone: provablePure({
      // broadcast event for winner
      winner: Field, // Field(0) = draw, Field(1) = P1, Field(2) = P2
      player1Choice: Field,
      player2Choice: Field,
      gameId: Field,
    }),
  };

  init() {
    super.init();
    this.gameCount.set(UInt32.zero);
    this.drawCount.set(UInt32.zero);
  }

  @method validate(p1Proof: RpsProveProof, p2Proof: RpsProveProof) {
    p1Proof.verify();
    p2Proof.verify();

    const p1Choice = p1Proof.publicOutput.revealedChoice;
    // assert choice is 1, 2, or 3 - already checked in proof
    // p1Choice
    //   .equals(Field(1))
    //   .or(p1Choice.equals(Field(2)))
    //   .or(p1Choice.equals(Field(3)))
    //   .assertTrue();

    const p2Choice = p2Proof.publicOutput.revealedChoice;
    // assert choice is 1, 2, or 3 - already checked in proof
    // p2Choice
    //   .equals(Field(1))
    //   .or(p2Choice.equals(Field(2)))
    //   .or(p2Choice.equals(Field(3)))
    //   .assertTrue();

    // they must have played the same game :)
    p1Proof.publicOutput.gameId.assertEquals(p2Proof.publicOutput.gameId);

    // check draw
    let draw = p1Choice.equals(p2Choice);

    // check if P1 wins
    let p1Wins = p1Choice
      .equals(Field(1))
      .and(p2Choice.equals(Field(3)))
      .or(p1Choice.equals(Field(2)).and(p2Choice.equals(Field(1))))
      .or(p1Choice.equals(Field(3)).and(p2Choice.equals(Field(2))));


    // check if P2 wins
    let p2Wins = p2Choice
      .equals(Field(1))
      .and(p1Choice.equals(Field(3)))
      .or(p2Choice.equals(Field(2)).and(p1Choice.equals(Field(1))))
      .or(p2Choice.equals(Field(3)).and(p1Choice.equals(Field(2))));

    const winner = Provable.switch([draw, p1Wins, p2Wins], Field, [
      Field(0),
      Field(1),
      Field(2),
    ]);

    // increment game count
    const gameCount = this.gameCount.getAndRequireEquals();
    this.gameCount.set(gameCount.add(1));

    const drawCount = this.drawCount.getAndRequireEquals();
    this.drawCount.set(Provable.if(draw, drawCount.add(1), drawCount));

    this.emitEvent("gameDone", {
      winner: winner,
      player1Choice: p1Choice,
      player2Choice: p2Choice,
      gameId: p1Proof.publicOutput.gameId,
    });
  }
}
