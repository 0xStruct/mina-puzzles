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

        choice.assertGreaterThanOrEqual(Field(1));
        choice.assertLessThanOrEqual(Field(3));

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
        // assert
        // hashedChoice.assertEquals(Poseidon.hash([choice, secret, gameId]), "assert error");

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

        revealedChoice.assertGreaterThanOrEqual(Field(1));
        revealedChoice.assertLessThanOrEqual(Field(3));

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
