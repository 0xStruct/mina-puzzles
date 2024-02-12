import { kv } from "@vercel/kv";
import { NextApiRequest, NextApiResponse } from "next";
import Ably from "ably/promises";
import {
  getGameResult,
  isPlayersMove,
  translatePlayerName,
} from "../../../../src/gameUtils";
import * as GameTypes from "../../../../src/types/Game";

import { Cache, Field, Poseidon, JsonProof } from "o1js";
import { TictactoeProve, TictactoeProveProof } from "../../../../src/TictactoeProve";

const { ABLY_API_KEY = "" } = process.env;

const client = new Ably.Rest(ABLY_API_KEY);

const endGame = async (game: GameTypes.Game, result: GameTypes.GameResult) => {
  const channel = client.channels.get(`game:${game.id}`);

  const resultMessage =
    result === "draw" ? "[Proofed] It is a draw." : `[Proofed] ${translatePlayerName(result)} wins!`;
  await channel.publish("message", resultMessage);
  await kv.del(game.id);
  await kv.del(game.players[0]);
  await kv.del(game.players[1]);
};

// turn serialedBoard field into board JS array
const getBoard = (boardField: Field) : string[][] => {
  let bits = boardField.toBits(18);
  let board = [];
  
  for (let i = 0; i < 3; i++) {
    let row = [];
    for (let j = 0; j < 3; j++) {
      const isPlayed = bits[i * 3 + j];
      const player = bits[i * 3 + j + 9];

      if(isPlayed.toString() === "true") {
        player.toString() === "true" ? row.push("x") : row.push("o");
      } else {
        row.push("");
      }
    }
    board.push(row);
  }
  console.log("board from proof", board);
  return board;
}

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  const { gameId } = request.query;

  if (typeof gameId !== "string") {
    return response
      .status(400)
      .send(JSON.stringify("gameId is required and must be a string"));
  }

  if (request.method !== "POST") {
    return response.status(405).send("Method Not Allowed");
  }

  let gameIdField: Field,
    player1Secret: Field,
    player1GamerId: Field,
    player2Secret: Field,
    player2GamerId: Field;

  console.log("compiling zkProgram ...");
  console.time("compile zkprogram");
  const cache: Cache = Cache.FileSystem("./cache");
  await TictactoeProve.compile({ cache }); // use cache for faster compilation
  console.timeEnd("compile zkprogram");

  // The `gameId` nullifier prevents replay attacks from happening
  gameIdField = Field(gameId);

  let prevProof: any, moveProof: any;

  // generate if this is the start of the game
  let kvPrevProof: JsonProof | null = await kv.get(`${gameId}:proof`);

  if (!kvPrevProof) {
    console.log("prevProof not present, generating baseProof ...");
    console.time("baseProof");

    let game: GameTypes.Game | null = await kv.get(gameId);
    console.log("game from KV:", game);

    // The secret acts like a password--its used to generate their gamer ID
    // currently just get the last chunk of uuid as secret
    player1Secret = Field(game!.players[0].split('-')[5]);
    player2Secret = Field(game!.players[1].split('-')[5]);

    // gameProof is not there, generate baseProof
    player1GamerId = Poseidon.hash([player1Secret]);
    player2GamerId = Poseidon.hash([player2Secret]);

    let baseProof = await TictactoeProve.start(
      player1GamerId,
      player2GamerId,
      gameIdField
    );

    prevProof = baseProof;
    // console.log(JSON.stringify(baseProof.toJSON()));
    console.timeEnd("baseProof");
  } else {
    // load it from KV proof string
    console.log("prevProof loaded from KV");
    prevProof = TictactoeProveProof.fromJSON(kvPrevProof);
  }

  const { row, column, playerId } = request.body;

  console.log("row", "column", "playerId", "gameId");
  console.log(row, column, playerId, gameId); // 1 2 150daa03-0d5d-4429-bd55-4baf53922bfd 1709051101735

  const game: GameTypes.Game | null = await kv.get(gameId);
  const channel = client.channels.get(`game:${gameId}`);

  if (!game) {
    return response.status(404).send("Game not found");
  }

  const playerIsFirst = game.players[0] === playerId;
  if (!isPlayersMove(playerIsFirst, game.state.grid)) {
    return response.status(400).send("It's not your turn");
  }

  const cell = game.state.grid[row][column];
  if (cell !== "") {
    return response.status(400).send("That cell is already taken");
  }

  // generate moveProof
  console.log("generatign moveProof ...")
  try {
    console.time("moveProof")
    moveProof = await TictactoeProve.move(
      Field(playerId.split("-")[5]), // playerSecret
      Field(row),
      Field(column),
      prevProof // baseProof or prevProof from KV
    );
    console.log("moveProof", moveProof.toJSON().publicOutput);
    console.timeEnd("moveProof");
  } catch (error) {
    console.log("error in moveProof generation", error);

    await channel.publish(
      "message",
      `[proof failed] proof generation rejected`
    );
    return response.status(400).send("proof generation rejected");
  }
  

  // game.state.grid[row][column] = playerIsFirst ? "x" : "o";
  game.state.grid = getBoard(Field(moveProof.toJSON().publicOutput[4]));

  await kv.set(gameId, game);
  await kv.set(`${gameId}:proof`, JSON.stringify(moveProof.toJSON()));

  await channel.publish("update", game);
  await channel.publish(
    "message",
    `[move proofed] board is now ${moveProof.toJSON().publicOutput[4]}`
  );

  const result = getGameResult(game.state.grid);
  if (result) {
    game.state.result = result;
    await endGame(game, result);
  }
  
  return response.status(200).send("Success");
}
