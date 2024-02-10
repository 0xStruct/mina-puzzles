/**
 * This is the `TicTacToe` SmartContract derived from o1js example
 * This is refactor/extended to enable `Game Room` concept as in Web2 games
 * Each predeployed contract would represent a `Game Room` 
 * WHEN its state gameDone is true, THEN new game can be run with the same contract
 * Game result is to be broadcasted as event, persisted on MerkleTree
 * Any player could start a game as `player1` and another player can join as `player2`
 * UI will be built utilizing websocket to create real-time player verus player game play
 */

import {
  Field,
  State,
  PublicKey,
  SmartContract,
  state,
  method,
  Bool,
  Provable,
  provablePure,
  Signature,
  Struct,
} from 'o1js';

import { Board } from './Board.js';

export { Tictactoe };

class Tictactoe extends SmartContract {
  // The board is serialized as a single field element
  @state(Field) board = State<Field>();
  // true -> player 1 | false -> player 2
  @state(Bool) nextIsPlayer1 = State<Bool>();
  // defaults to false, set to true when a player wins
  @state(Bool) gameDone = State<Bool>();
  // the two players who are allowed to play
  @state(PublicKey) player1 = State<PublicKey>();
  @state(PublicKey) player2 = State<PublicKey>();

  @state(Field) gameId = State<Field>();

  // contract events
  events = {
    gameDone: provablePure({
      winner: PublicKey,
      player1: PublicKey,
      player2: PublicKey,
      gameId: Field,
    }),
  };

  init() {
    super.init();
    this.gameDone.set(Bool(true));
    this.player1.set(PublicKey.empty());
    this.player2.set(PublicKey.empty());
  }

  // @method startGame(player1: PublicKey, player2: PublicKey) {
  //   // you can only start a new game if the current game is done
  //   this.gameDone.requireEquals(Bool(true));
  //   this.gameDone.set(Bool(false));
  //   // set players
  //   this.player1.set(player1);
  //   this.player2.set(player2);
  //   // reset board
  //   this.board.set(Field(0));
  //   // player 1 starts
  //   this.nextIsPlayer1.set(Bool(true));
  // }

  @method startGame(player1: PublicKey, gameId: Field) {
    // you can only start a new game if the current game is done
    this.gameDone.requireEquals(Bool(true));
    this.gameDone.set(Bool(false));
    
    // set player1
    this.player1.set(player1);
    // reset board
    this.board.set(Field(0));
    this.gameId.set(gameId);

    // player 1 starts
    this.nextIsPlayer1.set(Bool(true));
  }

  @method joinGame(player2: PublicKey) {
    // you can only join a game if player2 is empty
    const _player2 = this.player2.getAndRequireEquals();
    Bool(_player2.equals(PublicKey.empty())).assertTrue("player2 not empty");

    // set players
    this.player2.set(player2);
  }

  // board:
  //  x  0  1  2
  // y +----------
  // 0 | x  x  x
  // 1 | x  x  x
  // 2 | x  x  x
  @method play(pubkey: PublicKey, signature: Signature, x: Field, y: Field) {
    // 1. if the game is already finished, abort.
    this.gameDone.requireEquals(Bool(false)); // precondition on this.gameDone

    // and if player2 is empty, abort.
    const _player2 = this.player2.getAndRequireEquals();
    Bool(_player2.equals(PublicKey.empty())).assertFalse("player2 not empty");

    // 2. ensure that we know the private key associated to the public key
    //    and that our public key is known to the zkApp

    // ensure player owns the associated private key
    signature.verify(pubkey, [x, y]).assertTrue();

    // ensure player is valid
    const player1 = this.player1.getAndRequireEquals();
    const player2 = this.player2.getAndRequireEquals();
    Bool.or(pubkey.equals(player1), pubkey.equals(player2)).assertTrue();

    // 3. Make sure that its our turn,
    //    and set the state for the next player

    // get current player as true for player 1 and false for player 2
    const currentPlayer = pubkey.equals(player1); // player 1 is true, player 2 is false

    // ensure its their turn
    const nextPlayer = this.nextIsPlayer1.getAndRequireEquals();
    nextPlayer.assertEquals(currentPlayer);

    // set the next player
    this.nextIsPlayer1.set(currentPlayer.not());

    // 4. get and deserialize the board
    this.board.requireEquals(this.board.get()); // precondition that links this.board.get() to the actual on-chain state
    let board = new Board(this.board.get());

    // 5. update the board (and the state) with our move
    x.equals(Field(0))
      .or(x.equals(Field(1)))
      .or(x.equals(Field(2)))
      .assertTrue();
    y.equals(Field(0))
      .or(y.equals(Field(1)))
      .or(y.equals(Field(2)))
      .assertTrue();

    board.update(x, y, currentPlayer);
    this.board.set(board.serialize());

    // 6. did I just win? If so, update the state as well
    const won = board.checkWinner();
    this.gameDone.set(won);
  }

  @method resetGame() {
    this.gameDone.set(Bool(true));
    this.player1.set(PublicKey.empty());
    this.player2.set(PublicKey.empty());
    this.board.set(Field(0)); // reset board
  }
}
