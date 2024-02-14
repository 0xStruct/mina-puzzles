/**
 * This is the `TicTacToe` SmartContract derived from o1js example
 * This is refactor/extended to enable `Game Room` concept as in Web2 games
 * Each predeployed contract would represent a `Game Room` when its state gameDone is true
 * then new game can be run with the same contract
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
  Poseidon,
  Signature,
  Struct,
} from "o1js";

export { Rps };

class Rps extends SmartContract {
  // gameId to prevent frontrunning
  @state(Field) gameId = State<Field>();
  // defaults to false, set to true when a player wins
  @state(Bool) gameDone = State<Bool>();

  // the two players who are allowed to play
  @state(PublicKey) player1 = State<PublicKey>();
  @state(PublicKey) player2 = State<PublicKey>();

  // shared to save state count
  // Field of 0 = clean, Field of 1,2,3 = revealed choices, others = hashed choices
  @state(Field) p1HashedRevealedChoice = State<Field>();
  @state(Field) p2HashedRevealedChoice = State<Field>();

  // contract events
  events = {
    gameDone: provablePure({
      winner: PublicKey,
      player1: PublicKey,
      player2: PublicKey,
      player1Choice: Field,
      player2Choice: Field,
      gameId: Field,
    }),
  };

  init() {
    super.init();
    this.gameDone.set(Bool(true));
    this.player1.set(PublicKey.empty());
    this.player2.set(PublicKey.empty());

    this.p1HashedRevealedChoice.set(Field(0));
    this.p2HashedRevealedChoice.set(Field(0));
  }

  @method startGame(player1: PublicKey, player2: PublicKey, gameId: Field) {
    // you can only start a new game if the current game is done
    this.gameDone.requireEquals(Bool(true));
    this.gameDone.set(Bool(false));
    // set players
    this.player1.set(player1);
    this.player2.set(player2);

    this.p1HashedRevealedChoice.set(Field(0));
    this.p2HashedRevealedChoice.set(Field(0));

    this.gameId.set(gameId);
  }

  @method makeChoice(
    pubkey: PublicKey,
    signature: Signature,
    choice: Field,
    secret: Field
  ) {
    const gameId = this.gameId.getAndRequireEquals();

    // 1. if the game is already finished, abort.
    this.gameDone.requireEquals(Bool(false)); // precondition on this.gameDone

    // 2. verify signature is from pubkey
    signature.verify(pubkey, [choice, secret, gameId]).assertTrue();

    // ensure player is valid
    const player1 = this.player1.getAndRequireEquals();
    const player2 = this.player2.getAndRequireEquals();
    Bool.or(pubkey.equals(player1), pubkey.equals(player2)).assertTrue();

    // assert choice is 1, 2, or 3
    choice
      .equals(Field(1))
      .or(choice.equals(Field(2)))
      .or(choice.equals(Field(3)))
      .assertTrue("only 1,2,3");

    // set player's hashedChoice
    const currentPlayer = pubkey.equals(player1); // player 1 is true, player 2 is false

    const hashedRevealedChoice = Provable.if(
      currentPlayer,
      this.p1HashedRevealedChoice.getAndRequireEquals(),
      this.p2HashedRevealedChoice.getAndRequireEquals()
    );

    // assert that hashedRevealedChoice is Field(0)
    hashedRevealedChoice.equals(Field(0));

    const hashedChoice = Poseidon.hash([choice, secret, gameId]);

    this.p1HashedRevealedChoice.set(
      Provable.if(
        currentPlayer,
        hashedChoice,
        this.p1HashedRevealedChoice.getAndRequireEquals()
      )
    );
    this.p2HashedRevealedChoice.set(
      Provable.if(
        currentPlayer,
        this.p2HashedRevealedChoice.getAndRequireEquals(),
        hashedChoice
      )
    );
  }

  @method revealChoice(pubkey: PublicKey, signature: Signature, secret: Field) {
    const gameId = this.gameId.getAndRequireEquals();

    // 1. if the game is already finished, abort.
    this.gameDone.requireEquals(Bool(false)); // precondition on this.gameDone

    // 2. verify signature is from pubkey
    signature.verify(pubkey, [secret, gameId]).assertTrue();

    // ensure player is valid
    const player1 = this.player1.getAndRequireEquals();
    const player2 = this.player2.getAndRequireEquals();
    Bool.or(pubkey.equals(player1), pubkey.equals(player2)).assertTrue();

    // set player's hashedChoice
    const currentPlayer = pubkey.equals(player1); // player 1 is true, player 2 is false

    const hashedRevealedChoice = Provable.if(
      currentPlayer,
      this.p1HashedRevealedChoice.getAndRequireEquals(),
      this.p2HashedRevealedChoice.getAndRequireEquals()
    );

    // assert that hashedRevealedChoice is not equal to Field of 0, 1, 2, 3 means not revealed yet
    hashedRevealedChoice.assertNotEquals(Field(0));
    hashedRevealedChoice.assertNotEquals(Field(1));
    hashedRevealedChoice.assertNotEquals(Field(2));
    hashedRevealedChoice.assertNotEquals(Field(3));

    const otherHashedRevealedChoice = Provable.if(
      currentPlayer,
      this.p2HashedRevealedChoice.getAndRequireEquals(),
      this.p1HashedRevealedChoice.getAndRequireEquals()
    );

    // reject if other player has not made a choice yet
    otherHashedRevealedChoice.assertNotEquals(Field(0), "cannot reveal yet");

    // revealer does not even need to know his/her prev choice
    // just his/her secret will do
    let firstChoice = hashedRevealedChoice.equals(
      Poseidon.hash([Field(1), secret, gameId])
    );
    let secondChoice = hashedRevealedChoice.equals(
      Poseidon.hash([Field(2), secret, gameId])
    );
    let thirdChoice = hashedRevealedChoice.equals(
      Poseidon.hash([Field(3), secret, gameId])
    );

    let revealedChoice = Provable.switch(
      [firstChoice, secondChoice, thirdChoice],
      Field,
      [Field(1), Field(2), Field(3)]
    );

    // assert choice is 1, 2, or 3
    revealedChoice
      .equals(Field(1))
      .or(revealedChoice.equals(Field(2)))
      .or(revealedChoice.equals(Field(3)))
      .assertTrue();

    let currentP1Choice = this.p1HashedRevealedChoice.getAndRequireEquals();
    let currentP2Choice = this.p2HashedRevealedChoice.getAndRequireEquals();

    this.p1HashedRevealedChoice.set(
      Provable.if(currentPlayer, revealedChoice, currentP1Choice)
    );
    this.p2HashedRevealedChoice.set(
      Provable.if(currentPlayer, currentP2Choice, revealedChoice)
    );

    // if other player has revealed choice then game is done
    // check who wins or draw

    // const otherHasRevealed = otherHashedRevealedChoice
    //   .equals(Field(1))
    //   .or(revealedChoice.equals(Field(2)))
    //   .or(revealedChoice.equals(Field(3)));

    // console.log("otherHasRevealed", otherHasRevealed.value);

    // todo: set gameDone to true
    // this.gameDone.set(Bool(true));

    // todo: emit event
    // this.emitEvent("gameDone", {
    //   winner: winner,
    //   player1: this.player1.get(),
    //   player2: this.player2.get(),
    //   player1Choice: this.p1HashedRevealedChoice.get(),
    //   player2Choice: this.p2HashedRevealedChoice.get(),
    //   gameId: this.gameId.get()
    // });
  }
}
