import {
  Bool,
  Field,
  Poseidon,
  Provable,
  SelfProof,
  Struct,
  ZkProgram,
} from 'o1js';
import { Board } from './Board';

export class TictactoePublicOutput extends Struct({
  player1Id: Field,
  player2Id: Field,
  gameId: Field,
  nextIsPlayer1: Bool, // false -> player 2 | true -> player 1
  boardState: Field, // Current state of the board encoded as a field element
}) {}

export const TictactoeProve = ZkProgram({
  name: 'tictactoe-move',
  publicOutput: TictactoePublicOutput,

  methods: {
    start: {
      privateInputs: [Field, Field, Field],

      method: (
        player1GamerId: Field,
        player2GamerId: Field,
        gameId: Field
      ): TictactoePublicOutput => {
        let nextIsPlayer1 = Bool(true); // Player 1 will start
        let boardState = Field(0); // Intiial board state: empty

        let player1Id = Poseidon.hash([player1GamerId, gameId]);
        let player2Id = Poseidon.hash([player2GamerId, gameId]);

        return { player1Id, player2Id, gameId, nextIsPlayer1, boardState };
      },
    },

    move: {
      privateInputs: [Field, Field, Field, SelfProof],

      method: (
        secret: Field,
        x: Field,
        y: Field,
        previousProof: SelfProof<void, TictactoePublicOutput>
      ): TictactoePublicOutput => {
        // Previous move proof is valid
        previousProof.verify();

        let player1Id = previousProof.publicOutput.player1Id;
        let player2Id = previousProof.publicOutput.player2Id;
        let gameId = previousProof.publicOutput.gameId;

        // Verifies that the move was made by the player whose turn it is
        let secretHash = Poseidon.hash([secret]);
        let playerHash = Poseidon.hash([secretHash, gameId]);
        
        // playerHash === player2Id + nextIsPlayer1 * (player1Id - player2Id)
        playerHash.assertEquals(
          player2Id.add(
            previousProof.publicOutput.nextIsPlayer1
              .toField()
              .mul(player1Id.sub(player2Id))
          )
        );

        // It will be the next player's turn to move
        let nextIsPlayer1 = previousProof.publicOutput.nextIsPlayer1.not();

        // Square to fill must be valid
        x.equals(Field(0))
          .or(x.equals(Field(1)))
          .or(x.equals(Field(2)))
          .assertTrue();
        y.equals(Field(0))
          .or(y.equals(Field(1)))
          .or(y.equals(Field(2)))
          .assertTrue();

        // Define new board state
        let board = new Board(previousProof.publicOutput.boardState);
        board.update(x, y, previousProof.publicOutput.nextIsPlayer1);
        let newBoardState = board.serialize();

        return {
          player1Id,
          player2Id,
          gameId,
          nextIsPlayer1,
          boardState: newBoardState,
        };
      },
    },
  },
});

export class TictactoeProveProof extends ZkProgram.Proof(TictactoeProve) {}
