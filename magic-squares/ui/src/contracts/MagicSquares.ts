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
  provablePure,
  PublicKey
} from 'o1js';

export { PuzzleStruct, MagicSquaresZkApp };

class PuzzleStruct extends Struct({
  value: Provable.Array(Provable.Array(Field, 5), 5),
}) {
  static from(value: number[][]) {
    return new PuzzleStruct({ value: value.map((row) => row.map(Field)) });
  }

  hash() {
    return Poseidon.hash(this.value.flat());
  }
}

class MagicSquaresZkApp extends SmartContract {
  @state(Field) puzzleHash1 = State<Field>();
  @state(Field) puzzleHash2 = State<Field>();
  @state(Field) puzzleHash3 = State<Field>();
  @state(Field) puzzleHash4 = State<Field>();

  // contract events
  events = {
    solved: provablePure({
      solver: PublicKey,
      puzzleHash: Field
    }),
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

  @method update(puzzleInstance1: PuzzleStruct, puzzleInstance2: PuzzleStruct, puzzleInstance3: PuzzleStruct, puzzleInstance4: PuzzleStruct) {
    this.puzzleHash1.set(puzzleInstance1.hash());
    this.puzzleHash2.set(puzzleInstance2.hash());
    this.puzzleHash3.set(puzzleInstance3.hash());
    this.puzzleHash4.set(puzzleInstance4.hash());
  }

  @method submitSolution(
    puzzleRef: Field,
    puzzleInstance: PuzzleStruct,
    solutionInstance: PuzzleStruct
  ) {
    let puzzle = puzzleInstance.value;
    let solution = solutionInstance.value;

    // first, we check that the passed solution is a valid magic squares
    function getSum(array: Field[]) {
      return array[0].add(array[1]).add(array[2]).add(array[3]).add(array[4]);
    }

    function assertSumEquals(array: Field[]) {
      let sumOfRow1 = getSum(solution[0]);
      let sumOfArray = getSum(array);

      sumOfRow1.assertEquals(sumOfArray, 'unequal sums');
    }

    // check all rows
    for (let i = 0; i < 5; i++) {
      let row = solution[i];
      assertSumEquals(row);
    }

    // check all columns
    for (let j = 0; j < 5; j++) {
      let column = solution.map((row) => row[j]);
      assertSumEquals(column);
    }

    // check both diagonals
    let diagonal1 = [
      solution[0][0],
      solution[1][1],
      solution[2][2],
      solution[3][3],
      solution[4][4],
    ];
    assertSumEquals(diagonal1);

    let diagonal2 = [
      solution[0][4],
      solution[1][3],
      solution[2][2],
      solution[3][1],
      solution[4][0],
    ];
    assertSumEquals(diagonal2);

    // next, we check that the solution extends the initial puzzle
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        let cell = puzzle[i][j];
        let solutionCell = solution[i][j];
        // either the puzzle has nothing in it (indicated by a cell value of 0),
        // or it is equal to the solution
        Bool.or(cell.equals(0), cell.equals(solutionCell)).assertTrue(
          `solution cell (${i + 1},${j + 1}) matches the original puzzle`
        );
      }
    }

    // finally, we check that the puzzle is the one that was originally deployed
    const whichPuzzle: Bool[] = [
      puzzleRef.equals(Field(1)),
      puzzleRef.equals(Field(2)),
      puzzleRef.equals(Field(3)),
      puzzleRef.equals(Field(4))
    ];

    const puzzleHash = Provable.switch(whichPuzzle, Field, [
      this.puzzleHash1.getAndRequireEquals(),
      this.puzzleHash2.getAndRequireEquals(),
      this.puzzleHash3.getAndRequireEquals(),
      this.puzzleHash4.getAndRequireEquals()
    ]);

    puzzleInstance
      .hash()
      .assertEquals(puzzleHash, 'puzzle matches the one committed on-chain');

    this.emitEvent('solved', {
      solver: this.sender,
      puzzleHash: puzzleHash,
    });
  }
}
