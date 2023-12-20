import React from 'react';

// some style params
let grey = '#cccccc';
let darkGrey = '#999999';
let lightGrey = '#f6f6f6';
let thick = 'black solid 4px';
let thin = `${grey} solid 1px`;
let puzzleWidth = 450;
let rightColumnWidth = 275;

export default function MagicSquaresTable({ puzzle, editable, solution, setSolution }) {
  let cellSize = puzzleWidth / 5 + 'px';
  let fontSize = puzzleWidth / 18 + 'px';
  // console.log('solution', solution);

  function clonePuzzle(puzzle) {
    if (Array.isArray(puzzle[0])) {
      return puzzle.map((x) => clonePuzzle(x));
    } else {
      return [...puzzle];
    }
  }

  return (
    <table
      style={{
        border: thin,
        borderCollapse: 'collapse',
        fontSize,
      }}
    >
      <tbody>
        {puzzle.map((row, i) => (
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
                {!!x || !editable ? (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {x || ''}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={solution[i][j] || ''}
                    style={{
                      width: '100%',
                      height: '100%',
                      textAlign: 'center',
                      fontSize,
                      backgroundColor: lightGrey,
                      border: thin,
                    }}
                    onChange={(e) => {
                      let newPuzzle = clonePuzzle(solution);
                      newPuzzle[i][j] = Number(e.target.value);
                      setSolution(newPuzzle);
                    }}
                  ></input>
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
