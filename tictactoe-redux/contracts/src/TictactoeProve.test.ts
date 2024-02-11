import { Cache, Field, Poseidon, Provable } from 'o1js';
import { TictactoeProve } from './TictactoeProve';

describe('tictactoe-move', () => {
  let gameId: Field,
    player1Secret: Field,
    player2Secret: Field;

  let baseProof: any;

  beforeAll(async () => {
    console.log('compiling contract ...');
    console.time('compile contract');
    const cache: Cache = Cache.FileSystem('./cache');
    await TictactoeProve.compile({ cache });
    console.timeEnd('compile contract');

    // The `gameId` nullifier prevents replay attacks from happening
    gameId = Field(1);

    // The secret acts like a password--its used to generate their gamer ID
    player1Secret = Field(256);
    player2Secret = Field(512);

  });

  describe('Complete a game, with attempts to cheat', () => {
    let move1Proof: any,
      move2Proof: any,
      move3Proof: any,
      move4Proof: any,
      move5Proof: any;

    beforeAll(async () => {
      // generate the initial proof for players to play
      baseProof = await TictactoeProve.start(
        Poseidon.hash([player1Secret]),
        Poseidon.hash([player2Secret]),
        gameId
      );

      console.log(baseProof.toJSON().publicOutput);
    });

    it('[1st move] P2 tries to take P1 turn for a move, should not work', async () => {
      await expect(async () => {
        await TictactoeProve.move(player2Secret, Field(1), Field(1), baseProof);
      }).rejects.toThrow();
    });

    it('[1st move] P1 rightfully takes it turn', async () => {
      move1Proof = await TictactoeProve.move(
        player1Secret,
        Field(0),
        Field(0),
        baseProof
      );

      console.log("move1Proof", move1Proof.toJSON().publicOutput);
    });

    it('[2nd move] P1 tries to take P2 turn for an extra move, should not work', async () => {
      await expect(async () => {
        await TictactoeProve.move(
          player1Secret,
          Field(1),
          Field(1),
          move1Proof
        );
      }).rejects.toThrow();
    });

    it('[2nd move] P2 take its turn but make the invalid overwrite move, should not work', async () => {
      await expect(async () => {
        await TictactoeProve.move(
          player2Secret,
          Field(0),
          Field(0),
          move1Proof
        );
      }).rejects.toThrow();
    });

    it('[2nd move] P2 rightfully takes it turn', async () => {
      move2Proof = await TictactoeProve.move(
        player2Secret,
        Field(0),
        Field(1),
        move1Proof
      );

      console.log("move2Proof", move2Proof.toJSON().publicOutput);
    });

    it('[3rd move] P1 take the center square', async () => {
      move3Proof = await TictactoeProve.move(
        player1Secret,
        Field(1),
        Field(1),
        move2Proof
      );

      console.log("move3Proof", move3Proof.toJSON().publicOutput);
    });

    it('[4th move] P2 does not block P1', async () => {
      move4Proof = await TictactoeProve.move(
        player2Secret,
        Field(0),
        Field(2),
        move3Proof
      );

      console.log("move4Proof", move4Proof.toJSON().publicOutput);
    });

    it('[5th move] P1 takes a winning move via diagonal', async () => {
      move5Proof = await TictactoeProve.move(
        player1Secret,
        Field(2),
        Field(2),
        move4Proof
      );

      console.log("move5Proof", move5Proof.toJSON().publicOutput);
    });

  });
});
