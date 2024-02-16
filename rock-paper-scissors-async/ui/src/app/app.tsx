"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as Ably from "ably/promises";
import { AblyProvider } from "ably/react";
import { v4 as uuid } from "uuid";
import * as GameTypes from "../types/Game";
import Game from "./components/Game";
import { emptyGame } from "../gameUtils";

const PLAYER_ID = "rps-async-playerId";
const PLAYER_SECRET = "rps-async-playerSecret";
let playerId: string = localStorage.getItem(PLAYER_ID) || "";
let playerSecret: string = localStorage.getItem(PLAYER_SECRET) || "";
if (!playerId || typeof playerId !== "string") {
  playerSecret = (Math.floor(Math.random() * (99999 - 10000)) + 100000).toString(); // Generate a random secret for first-time players
  playerId = uuid(); // Generate a random uuid for first-time players
  localStorage.setItem(PLAYER_ID, playerId);
  localStorage.setItem(PLAYER_SECRET, playerSecret);
}
console.log("playerId", playerId);

// Create an Ably client
const client = new Ably.Realtime.Promise({
  authUrl: "/api/ably/auth",
  clientId: playerId,
});

let isFetchingGame = false;
let fetchedGame = emptyGame();

const fetchGame = async (forceNewGame = false) => {
  if (isFetchingGame) {
    return fetchedGame;
  }

  isFetchingGame = true;

  const response = await fetch(
    `/api/game?playerId=${playerId}&forceNewGame=${
      forceNewGame === true ? "true" : "false"
    }`
  );
  fetchedGame = await response.json();
  console.log("fetchedGame", fetchedGame)
  isFetchingGame = false;
  return fetchedGame;
};

type AppContext = {
  playerId: string;
  playerSecret: string;
  game: GameTypes.Game;
  fetchGame: (forceNewGame?: boolean) => Promise<GameTypes.Game>;
  setGame: (game: GameTypes.Game | null) => void;
  gameResult: string | null;
  isMyMove: boolean;
};

const AppContext = createContext<AppContext>({
  // Set defaults
  playerId,
  playerSecret,
  fetchGame,
  game: emptyGame(),
  setGame: () => {},
  gameResult: null,
  isMyMove: false,
});

export const useAppContext = () => useContext(AppContext);

export default function App() {
  const [game, setGame] = useState<GameTypes.Game>(emptyGame);

  // Fetch a game on mount
  useEffect(() => {
    fetchGame()
      .then((currentGame) => {
        console.log("currentGame", currentGame);
        setGame(currentGame);
      })
      .catch((error) => console.log(error));
  }, []);

  // The result of the game, if it's been concluded.
  // const gameResult = useMemo(() => {
  //   if (!game?.state?.grid) return null;

  //   return getGameResult(game?.state.grid);
  // }, [game?.state?.grid]);
  const gameResult = null;

  // Is it the current player's move?
  const isMyMove = useMemo(() => {
    if (!game) return false;

    const playerIsFirst = game.players[0] === playerId;
    //return isPlayersMove(playerIsFirst, game.state.grid);
    return false;
  }, [game]);

  return (
    <AblyProvider client={client}>
      <AppContext.Provider
        value={
          {
            playerId,
            playerSecret,
            game: game as GameTypes.Game,
            fetchGame,
            setGame,
            gameResult,
            isMyMove,
          } as AppContext
        }
      >
        <main>
          <h1>Mina Puzzles: 👊✋✌️ async</h1>
          {game.id && <Game key={game.id} />}
        </main>
      </AppContext.Provider>
    </AblyProvider>
  );
}
