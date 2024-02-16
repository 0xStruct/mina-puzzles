import { kv } from "@vercel/kv";
import { NextApiRequest, NextApiResponse } from "next";
import Ably from "ably/promises";
import * as GameTypes from "../../../../src/types/Game";

import { Cache, Field, Poseidon, JsonProof } from "o1js";
import { RpsProve, RpsProveProof } from "../../../../src/RpsProve";

const { ABLY_API_KEY = "" } = process.env;

const client = new Ably.Rest(ABLY_API_KEY);

const endGame = async (game: GameTypes.Game, result: string) => {
  const channel = client.channels.get(`game:${game.id}`);

  const resultMessage =
    result === "draw" ? "[Done] It is a draw." : `[Done] ${result} wins!`;
  await channel.publish("message", resultMessage);
  await kv.del(game.id);
  await kv.del(game.players[0]);
  await kv.del(game.players[1]);
};

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

  let gameIdField: Field;

  console.log("compiling zkProgram ...");
  console.time("compile zkprogram");
  const cache: Cache = Cache.FileSystem("./cache");
  await RpsProve.compile({ cache }); // use cache for faster compilation
  console.timeEnd("compile zkprogram");

  // The `gameId` nullifier prevents replay attacks from happening
  gameIdField = Field(gameId);

  const { choice, requestType, playerSecret, playerId } = request.body;

  console.log("choice", "requestType", "playerId", "gameId");
  console.log(choice, requestType, playerId, gameId); // 1 2 150daa03-0d5d-4429-bd55-4baf53922bfd 1709051101735

  const game: GameTypes.Game | null = await kv.get(gameId);
  const channel = client.channels.get(`game:${gameId}`);
  const CHOICES = ["", "👊", "✋", "✌️"];

  if (!game) {
    return response.status(404).send("Game not found");
  }

  let currentPlayerIndex = 0;
  if(game.players[1] === playerId) currentPlayerIndex = 1;

  // generate proof
  console.log("generating proof ...");
  let choiceProof: any, revealProof: any;

  if(requestType === "choice") {
    try {
      console.log("choiceProof ...");
      console.time("choiceProof");
      choiceProof = await RpsProve.choice(
        Field(Number(choice)), // choice: 1 rock, 2 paper, 3 scissors
        Field(Number(playerSecret)), // secret
        gameIdField
      );
      console.timeEnd("choiceProof");
      console.log("choiceProof", choiceProof.toJSON().publicOutput);

      game.hashedChoices[currentPlayerIndex] = choiceProof.toJSON().publicOutput[0];

      await kv.set(gameId, game);
      console.log("choiceProof", game)

      await channel.publish("update", game);
      await channel.publish(
        "message",
        `[P${currentPlayerIndex + 1}] made a hidden choice`
      );

    } catch(error) {
      console.log("choiceProof error", error);
    }
  }
  
  if(requestType === "reveal") {
    try {
      console.log("revealProof ...");
      console.time("revealProof");
      revealProof = await RpsProve.reveal(
        Field(choice), // hashedChoice
        Field(Number(playerSecret)), // secret
        gameIdField
      );
      console.timeEnd("revealProof");
      console.log("revealProof", revealProof.toJSON().publicOutput);

      game.revealedChoices[currentPlayerIndex] = revealProof.toJSON().publicOutput[2];

      await kv.set(gameId, game);

      await channel.publish("update", game);
      await channel.publish(
        "message",
        `[P${currentPlayerIndex + 1}] revealed: ${CHOICES[Number(revealProof.toJSON().publicOutput[2])]}`
      );

    } catch(error) {
      console.log("revealProof error", error);
    }
  }

  let result: string = "";
  if(["1", "2", "3"].includes(game.revealedChoices[0]) && ["1", "2", "3"].includes(game.revealedChoices[1])) {
    if(game.revealedChoices[0] === game.revealedChoices[1]) result = "draw";

    if(game.revealedChoices[0] === "1" && game.revealedChoices[1] === "3") result = "P1";
    if(game.revealedChoices[0] === "2" && game.revealedChoices[1] === "1") result = "P1";
    if(game.revealedChoices[0] === "3" && game.revealedChoices[1] === "2") result = "P1";

    if(game.revealedChoices[1] === "1" && game.revealedChoices[0] === "3") result = "P2";
    if(game.revealedChoices[1] === "2" && game.revealedChoices[0] === "1") result = "P2";
    if(game.revealedChoices[1] === "3" && game.revealedChoices[0] === "2") result = "P2";

  }

  if (result.length) {
    game.state.result = result;
    await endGame(game, result);
  }
  
  return response.status(200).send("Success");
}
