import * as GameTypes from "./types/Game";

export function newGameState(): GameTypes.GameState {
  return {
    result: "",
  };
}

export const emptyGame = () => {
  return {
    id: "",
    players: [],
    hashedChoices: ["", ""],
    revealedChoices: ["", ""],
    state: newGameState(),
  };
};

// Use times / circle unicode symbols for player names instead of x and o
export const playerNames = ["P1", "P2"];

// Convert a player ID to a player name based on its position in the players
// array, where, in our context, the first player is always X and the second
// player is always O
export const playerName = (playerId: string, players: string[]) => {
  if (playerId === players[0]) {
    return playerNames[0];
  } else if (playerId === players[1]) {
    return playerNames[1];
  } else {
    return;
  }
};

export const translatePlayerName = (name: string) => {
  if (name === "x") {
    return playerNames[0];
  } else if (name === "o") {
    return playerNames[1];
  }
};
