import { Cache, Field, Poseidon, Provable, Proof } from "o1js";
import { RpsProve, RpsProveProof, RpsProvePublicOutput } from "./RpsProve";

describe("rps-prove", () => {
  let gameId: Field, player1Secret: Field, player2Secret: Field;

  beforeAll(async () => {
    const cache: Cache = Cache.FileSystem("./cache");
    await RpsProve.compile({ cache });

    // The `gameId` nullifier prevents replay attacks from happening
    gameId = Field(123);

    // The secret is salt for hashing choices to make them hidden
    player1Secret = Field(256);
    player2Secret = Field(512);
  });

  // A player makes a hashed choice, then reveals that hashed choice
  describe("A player makes a hashed choice, then reveal that hashed choice", () => {
    let choiceProof: Proof<undefined, RpsProvePublicOutput>,
      revealProof: Proof<undefined, RpsProvePublicOutput>;

    beforeAll(async () => {});

    it("Player1 makes a wrong choice not 1, 2, or 3", async () => {
      await expect(async () => {
        choiceProof = await RpsProve.choice(
          Field(100), // choice: 1 rock, 2 paper, 3 scissors
          Field(player1Secret), // secret
          gameId
        );
      }).rejects.toThrow();
    });

    it("Player1 makes a right choice of 1, 2, or 3", async () => {
      choiceProof = await RpsProve.choice(
        Field(1), // choice: 1 rock, 2 paper, 3 scissors
        Field(player1Secret), // secret
        gameId
      );

      console.log(choiceProof.toJSON().publicOutput);
    });

    it("Player1 reveals with wrong secret", async () => {
      await expect(async () => {
        revealProof = await RpsProve.reveal(
          Field(choiceProof.toJSON().publicOutput[0]), // hashedChoice
          Field(111), // wrong secret
          gameId
        );
      }).rejects.toThrow();
    });

    it("Player1 reveals with right secret", async () => {
      revealProof = await RpsProve.reveal(
        Field(choiceProof.toJSON().publicOutput[0]), // hashedChoice
        Field(player1Secret), // wrong secret
        gameId
      );

      revealProof.publicOutput.hashedChoice.assertEquals(
        choiceProof.publicOutput.hashedChoice
      );
      revealProof.publicOutput.gameId.assertEquals(
        choiceProof.publicOutput.gameId
      );
      revealProof.publicOutput.revealedChoice.assertEquals(Field(1)); // rock
    });
  });
});
