import {
  SmartContract,
  state,
  UInt32,
  Bool,
  Field,
  State,
  method,
  Provable,
  provablePure,
} from "o1js";
import { TictactoeProveProof } from "./TictactoeProve";
import { Board } from "./Board";

export class TictactoeProveValidator extends SmartContract {
  @state(UInt32) gameCount = State<UInt32>(); // just count how many games have been player

  // contract events
  events = {
    gameDone: provablePure({
      // broadcast event for winner
      winner: Field, // Field(1) = P1, Field(2) = P2
      player1Id: Field,
      player2Id: Field,
      gameId: Field,
    }),
  };

  init() {
    super.init();
    this.gameCount.set(UInt32.zero);
  }

  @method validate(gameProof: TictactoeProveProof) {
    gameProof.verify();

    // deserialize the board from publicOutput boardState
    let board = new Board(gameProof.publicOutput.boardState);

    const won = board.checkWinner();

    won.assertEquals(new Bool(true));

    // increment game count
    const gameCount = this.gameCount.getAndRequireEquals();
    this.gameCount.set(gameCount.add(1));

    // winner
    const winner = Provable.if(gameProof.publicOutput.nextIsPlayer1, Field(2), Field(1));

    this.emitEvent("gameDone", {
      winner: winner,
      player1Id: gameProof.publicOutput.player2Id,
      player2Id: gameProof.publicOutput.player1Id,
      gameId: gameProof.publicOutput.gameId,
    });
  }
}
