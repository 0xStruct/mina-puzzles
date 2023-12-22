import React from "react";
import Avatar from "boring-avatars";

// some style params
let grey = "#cccccc";
let darkGrey = "#999999";
let lightGrey = "#f6f6f6";
let thick = "black solid 4px";
let thin = `${lightGrey} solid 0px`;
let puzzleWidth = 600;

export default function Avatars({ avatars, solution, setSolution }) {
  let cellSize = puzzleWidth / 10 + "px";

  return (
    <table
      style={{
        borderCollapse: "collapse",
      }}
    >
      <tbody>
        {avatars.map((row, i) => (
          <tr key={i}>
            {row.map((x, j) => (
              <td
                key={j}
                style={{
                  width: cellSize,
                  height: cellSize,
                  borderRight: thin,
                  borderBottom: thin,
                }}
              >
                <button
                  onClick={() => {
                    setSolution(avatars[i][j]);
                  }}
                  style={{border: solution === avatars[i][j] ? "4px solid #78BD91" : "4px solid #fff", padding: "2px"}}
                >
                  <Avatar
                    size={60}
                    square={true}
                    name={String(avatars[i][j])}
                    variant="beam"
                    colors={[
                      "#FB6A3D",
                      "#FBE5AC",
                      "#361D20",
                      "#A2BC97",
                      "#F7CD67",
                    ]}
                  />
                </button>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
