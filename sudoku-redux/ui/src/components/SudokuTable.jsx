import React from 'react';

// some style params
let grey = '#cccccc';
let darkGrey = '#999999';
let lightGrey = '#f6f6f6';
let thick = 'black solid 4px';
let thin = `${grey} solid 1px`;
let sudokuWidth = 450;
let rightColumnWidth = 275;

export default function SudokuTable({ sudoku, editable, solution, setSolution }) {
  let cellSize = sudokuWidth / 9 + 'px';
  let fontSize = sudokuWidth / 18 + 'px';
  // console.log('solution', solution);

  function cloneSudoku(sudoku) {
    if (Array.isArray(sudoku[0])) {
      return sudoku.map((x) => cloneSudoku(x));
    } else {
      return [...sudoku];
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
        {sudoku.map((row, i) => (
          <tr key={i}>
            {row.map((x, j) => (
              <td
                key={j}
                style={{
                  width: cellSize,
                  height: cellSize,
                  borderRight: j === 2 || j === 5 ? thick : thin,
                  borderBottom: i === 2 || i === 5 ? thick : thin,
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
                      let newSudoku = cloneSudoku(solution);
                      newSudoku[i][j] = Number(e.target.value);
                      setSolution(newSudoku);
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
