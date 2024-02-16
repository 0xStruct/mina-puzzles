import { useAppContext } from "../../app";
import * as GameTypes from "../../../types/Game";
import classnames from "classnames";
import { useState, useEffect } from "react";

type GridProps = {
  className?: string;
};

const Versus = ({ className = "" }: GridProps) => {
  const {
    playerId,
    playerSecret,
    game,
    setGame,
    gameResult,
    fetchGame,
    isMyMove,
  } = useAppContext();

  const [playerState, setPlayerState] = useState("🤔");
  const [opponentState, setOpponentState] = useState("🤔");
  const [isDoing, setIsDoing] = useState(false);

  let CHOICES = ["", "👊", "✋", "✌️"];
  
  let playerIndex: number = 0,
    opponentIndex: number = 1;
  if (playerId === game.players[1]) {
    playerIndex = 1;
    opponentIndex = 0;
  }

  useEffect(() => {
    if (
      game.hashedChoices[playerIndex] !== "" &&
      game.revealedChoices[playerIndex] === ""
    )
      setPlayerState("😎");
    if (
      game.hashedChoices[opponentIndex] !== "" &&
      game.revealedChoices[opponentIndex] === ""
    )
      setOpponentState("😎");

    if (["1", "2", "3"].includes(game.revealedChoices[playerIndex]))
      setPlayerState(CHOICES[Number(game.revealedChoices[playerIndex])]);
    if (["1", "2", "3"].includes(game.revealedChoices[opponentIndex]))
      setOpponentState(CHOICES[Number(game.revealedChoices[opponentIndex])]);
  }, [game]);

  // If there's only one player, we're waiting for the game to begin.
  if (game.players.length < 2) {
    return <div>Waiting for an opponent…</div>;
  }

  // Set some shortcuts for the sake of brevity
  const state = game?.state;

  const onChoice = (choice: number) => {
    // Can't make choice if the game is over
    if (gameResult) return;

    // Can't make choice if any player has revealed
    // if () return;

    setIsDoing(true);

    // Send the choice to the back end
    // generate choiceProof server side
    fetch(`/api/game/${game.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        choice,
        requestType: "choice",
        playerSecret,
        playerId,
      }),
    }).then(response => setIsDoing(false)).catch((error) => {
      console.error("Error:", error);
    });
  };

  const onReveal = () => {
    // Can't make choice if the game is over
    if (gameResult) return;

    // Can't reveal if any player hasn't made choice
    // if () return;

    let playerIndex = 0;
    if (playerId === game.players[1]) playerIndex = 1;

    console.log(
      "onReveal player hashedChoice",
      game.hashedChoices[playerIndex]
    );

    setIsDoing(true);

    // Send the reveal to the back end
    // generate revealProof server side
    fetch(`/api/game/${game.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        choice: game.hashedChoices[playerIndex],
        requestType: "reveal",
        playerSecret,
        playerId,
      }),
    }).then(response => setIsDoing(false)).catch((error) => {
      console.error("Error:", error);
    });
  };

  return (
    <div>
      <div className="mb-4 text-sm">Game ID: {game.id}</div>
      {/*<Status game={game} playerId={playerId} isMyMove={isMyMove} />*/}
      <section
        className={classnames(`${className}`, {
          "my-move": isMyMove && !gameResult,
        })}
      >
        <div className="versus-title flex flex-row mb-4 mt-4">
          <div className="w-2/5 text-sm">P{playerIndex + 1}: YOU</div>
          <div className="w-1/5 text-sm">vs</div>
          <div className="w-2/5 text-sm">P{opponentIndex + 1}: Opponent</div>
        </div>
        <div className="versus">
          <div className="w-1/2">{playerState}</div>
          <div className="w-1/2">{opponentState}</div>
        </div>
        {playerState === "🤔" && !isDoing && <div className="choices">
          <button className="drop-shadow-md" onClick={() => onChoice(1)}>
            👊
          </button>
          <button className="drop-shadow-md" onClick={() => onChoice(2)}>
            ✋
          </button>
          <button className="drop-shadow-md" onClick={() => onChoice(3)}>
            ✌️
          </button>
        </div>}
        {playerState === "😎" && opponentState === "🤔" && <div className="mb-2">Waiting for opponent<br/> to make a choice</div>}
        {playerState === "😎" && !isDoing && ["😎", "👊", "✋", "✌️"].includes(opponentState) && <div className="reveal">
          <button className="drop-shadow-md" onClick={() => onReveal()}>
            🎉 Reveal!
          </button>
        </div>}
        {isDoing && <div className="m-2">Generating proof ...</div>}
      </section>
      {state.result && (
        <button
          onClick={() => {
            fetchGame(true)
              .then(setGame)
              .catch((error) => console.log(error));
          }}
        >
          Play again?
        </button>
      )}
    </div>
  );
};

// This status component shows "you vs opponent" thinking, choice made, revealed?
// whether the game has been won/lost/drawn.
const Status = ({
  game,
  playerId,
  isMyMove,
}: {
  game: GameTypes.Game;
  playerId: string;
  isMyMove: boolean;
}) => {
  const { result } = game.state;

  let statusText;
  if (!result) {
    if (game.players.length < 2) {
      statusText = "Waiting for an opponent…";
    } else {
      statusText = `Now is ${isMyMove ? "your" : "opponent’s"} turn.`;
    }
  } else {
    if (result === "draw") {
      statusText = "It is a draw.";
    } else if (
      (result === "x" && game.players[0] === playerId) ||
      (result === "o" && game.players[1] === playerId)
    ) {
      statusText = "You won!";
    } else {
      statusText = "You lost!";
    }
  }

  return <div>{statusText}</div>;
};

export default Versus;
