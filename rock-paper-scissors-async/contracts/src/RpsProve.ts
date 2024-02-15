import {
  Bool,
  Field,
  Poseidon,
  SelfProof,
  Provable,
  Struct,
  ZkProgram,
} from "o1js";

export class RpsProvePublicOutput extends Struct({
  hashedChoice: Field,
  revealed: Bool,
  revealedChoice: Field,
  gameId: Field,
}) {}

export const RpsProve = ZkProgram({
  name: "rock-paper-scissors",
  publicInput: undefined,
  publicOutput: RpsProvePublicOutput,

  methods: {
    choice: {
      privateInputs: [Field, Field, Field],

      method: (
        choice: Field,
        secret: Field,
        gameId: Field
      ): RpsProvePublicOutput => {
        // assert choice is 1, 2, or 3
        choice
          .equals(Field(1))
          .or(choice.equals(Field(2)))
          .or(choice.equals(Field(3)))
          .assertTrue();

        return {
          hashedChoice: Poseidon.hash([choice, secret, gameId]),
          revealed: Bool(false),
          revealedChoice: Field(0), // default as 0
          gameId: gameId,
        };
      },
    },

    reveal: {
      privateInputs: [Field, Field, Field],

      method: (
        hashedChoice: Field,
        secret: Field,
        gameId: Field
      ): RpsProvePublicOutput => {
        // revealer does not even need to know his/her prev choice
        // just his/her secret will do
        let firstChoice = hashedChoice.equals(
          Poseidon.hash([Field(1), secret, gameId])
        );
        let secondChoice = hashedChoice.equals(
          Poseidon.hash([Field(2), secret, gameId])
        );
        let thirdChoice = hashedChoice.equals(
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

        return {
          hashedChoice,
          revealed: Bool(true),
          revealedChoice,
          gameId,
        };
      },
    },
  },
});

export class RpsProveProof extends ZkProgram.Proof(RpsProve) {}
