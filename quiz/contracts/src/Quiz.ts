import {
  Field,
  SmartContract,
  method,
  Bool,
  state,
  State,
  Poseidon,
  Struct,
  Provable,
} from 'o1js';

export { QuizZkApp };

// class SubmissionStruct extends Struct({
//   value: Provable.Array(Field, 3),
// }) {
//   static from(value: number[]) {
//     return new SubmissionStruct({ value: value.map(Field) });
//   }

//   hash() {
//     return Poseidon.hash(this.value.flat());
//   }
// }

// to-do emitEvent struct
// class SolvedEvent extends Struct({ solver: Field, puzzle: Field}) {

// }

class QuizZkApp extends SmartContract {
  @state(Field) solutionHash = State<Field>();

  // contract events
  events = {
    solved: Field, // to-do support SolvedEvent struct later
  };

  /**
   * by making this a `@method`, we ensure that a proof is created for the state initialization.
   * alternatively (and, more efficiently), we could have used `super.init()` inside `update()` below,
   * to ensure the entire state is overwritten.
   * however, it's good to have an example which tests the CLI's ability to handle init() decorated with `@method`.
   */
  @method init() {
    super.init();
  }

  @method update(solutionHash: Field) {
    this.solutionHash.set(solutionHash); // to-do support multiple games
  }

  @method submitSolution(submission1: Field, submission2: Field, submission3: Field) {
    let submissionHash = Poseidon.hash([submission1, submission2, submission3]);

    const solutionHash = this.solutionHash.getAndRequireEquals();

    submissionHash.assertEquals(solutionHash, "wrong solution");

    // emit event
    this.emitEvent(
      'solved',
      this.sender.toFields()[0] // to-do support SolvedEvent struct later
    );
  }
}
