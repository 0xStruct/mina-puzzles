const gameResult = {
  DRAW: "draw",
  NORESULT: "",
};
export type GameResult = typeof gameResult[keyof typeof gameResult];

export type GameState = {
  result: GameResult;
};

export type Game = {
  id: string;
  players: string[];
  hashedChoices: string[];
  revealedChoices: string[];
  state: GameState;
};
