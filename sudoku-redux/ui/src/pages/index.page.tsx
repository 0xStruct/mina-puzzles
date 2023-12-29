import { useEffect, useState } from "react";
import "./reactCOIServiceWorker";
import ZkappWorkerClient from "./zkappWorkerClient";
import { PublicKey, Field } from "o1js";
import SudokuTable from "../components/SudokuTable";
import styles from "../styles/Home.module.css";
import { solveSudoku } from "../contracts/sudoku-lib";

let transactionFee = 0.1;
const ZKAPP_ADDRESS = process.env.NEXT_PUBLIC_ZKAPP_ADDRESS;

export default function Home() {
  const [state, setState] = useState({
    zkappWorkerClient: null as null | ZkappWorkerClient,
    hasWallet: null as null | boolean,
    hasBeenSetup: false,
    accountExists: false,
    sudokuHashes: null as null | Field[],
    publicKey: null as null | PublicKey,
    zkappPublicKey: null as null | PublicKey,
    creatingTransaction: false,
  });

  const [solved, setSolved] = useState({
    total: 0,
    currentUser: 0,
    isLoaded: false,
  });

  const [selectedSudoku, setSelectedSudoku] = useState(1);

  // get sudokus by first updating the contract
  // refer to contracts/update.ts
  // npm run build
  // node ./build/src/update.js
  // in console log sudokus set for contract states will be logged
  let sudokus = [
    [[]], // empty puzzle for index 0
    [
      [9, 1, 7, 8, 0, 2, 4, 5, 3],
      [3, 5, 2, 7, 1, 4, 6, 9, 8],
      [6, 8, 4, 3, 5, 9, 2, 1, 7],
      [8, 7, 6, 5, 4, 1, 9, 3, 2],
      [5, 2, 1, 6, 9, 3, 7, 8, 0],
      [4, 9, 3, 2, 0, 8, 1, 0, 5],
      [1, 6, 8, 4, 0, 7, 0, 2, 9],
      [2, 4, 9, 1, 8, 5, 0, 7, 6],
      [7, 0, 5, 0, 2, 6, 8, 4, 1],
    ],
    [
      [0, 9, 5, 2, 4, 8, 0, 7, 1],
      [0, 4, 7, 6, 0, 1, 3, 9, 8],
      [6, 1, 8, 3, 7, 9, 2, 5, 4],
      [1, 5, 2, 7, 0, 6, 8, 4, 3],
      [7, 8, 3, 4, 0, 5, 1, 6, 9],
      [0, 0, 9, 8, 1, 3, 0, 2, 5],
      [5, 0, 4, 0, 8, 2, 9, 0, 6],
      [9, 3, 0, 5, 0, 0, 0, 8, 2],
      [0, 0, 6, 9, 0, 0, 5, 1, 7],
    ],
    [
      [0, 1, 0, 2, 4, 5, 8, 0, 3],
      [9, 5, 0, 6, 3, 1, 4, 2, 7],
      [2, 3, 0, 8, 0, 0, 1, 5, 6],
      [1, 6, 2, 4, 0, 3, 0, 0, 8],
      [8, 7, 5, 0, 2, 9, 6, 3, 0],
      [0, 4, 9, 7, 0, 6, 2, 1, 5],
      [5, 2, 1, 3, 6, 8, 0, 0, 9],
      [0, 8, 3, 9, 7, 2, 5, 6, 0],
      [0, 0, 0, 0, 1, 4, 3, 8, 2],
    ],
    [
      [1, 3, 0, 0, 0, 0, 0, 0, 0],
      [4, 0, 9, 0, 3, 2, 0, 0, 0],
      [5, 6, 2, 0, 7, 4, 9, 8, 3],
      [0, 0, 4, 2, 0, 9, 5, 0, 8],
      [6, 0, 0, 8, 4, 1, 0, 9, 2],
      [9, 2, 0, 7, 0, 3, 0, 6, 1],
      [0, 9, 0, 0, 1, 0, 8, 4, 5],
      [3, 7, 0, 4, 0, 8, 6, 0, 9],
      [8, 0, 1, 6, 0, 5, 3, 0, 7],
    ],
  ];

  let [sudoku, setSudoku] = useState(sudokus[1]);
  let [solution, setSolution] = useState(sudokus[1]);

  let bravo = solveSudoku(sudokus[1])!;
  // console.log("bravo", bravo);

  const [displayText, setDisplayText] = useState("");
  const [transactionlink, setTransactionLink] = useState("");

  // -------------------------------------------------------
  // Do Setup

  useEffect(() => {
    async function timeout(seconds: number): Promise<void> {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, seconds * 1000);
      });
    }

    (async () => {
      if (!state.hasBeenSetup) {
        // setSolution(bravo);
        setDisplayText("Loading web worker...");
        console.log("Loading web worker...");
        const zkappWorkerClient = new ZkappWorkerClient();
        await timeout(5);

        setDisplayText("Done loading web worker");
        console.log("Done loading web worker");

        await zkappWorkerClient.setActiveInstanceToBerkeley();

        const mina = (window as any).mina;

        if (mina == null) {
          setState({ ...state, hasWallet: false });
          return;
        }

        const publicKeyBase58: string = (await mina.requestAccounts())[0];
        const publicKey = PublicKey.fromBase58(publicKeyBase58);

        console.log(`Using key: ${publicKey.toBase58()}`);
        setDisplayText(`Using key: ${publicKey.toBase58()}`);

        setDisplayText("Checking if fee payer account exists...");
        console.log("Checking if fee payer account exists...");

        const res = await zkappWorkerClient.fetchAccount({
          publicKey: publicKey!,
        });
        const accountExists = res.error == null;

        await zkappWorkerClient.loadContract();

        const zkappPublicKey = PublicKey.fromBase58(ZKAPP_ADDRESS!);

        await zkappWorkerClient.initZkappInstance(zkappPublicKey);

        console.log("Getting zkApp state...");
        setDisplayText("Getting zkApp state...");
        await zkappWorkerClient.fetchAccount({ publicKey: zkappPublicKey });
        const sudokuHashes = await zkappWorkerClient.getSudokuHashes();
        console.log(`Current state in zkApp: ${sudokuHashes[0].toString()}`);
        setDisplayText("");

        console.log("Compiling zkApp...");
        setDisplayText("Compiling zkApp...");
        await zkappWorkerClient.compileContract();
        console.log("zkApp compiled");
        setDisplayText("zkApp compiled...");

        setState({
          ...state,
          zkappWorkerClient,
          hasWallet: true,
          hasBeenSetup: true,
          publicKey,
          zkappPublicKey,
          accountExists,
          sudokuHashes,
        });
      }
    })();
  }, []);

  // -------------------------------------------------------
  // Wait for account to exist, if it didn't

  useEffect(() => {
    (async () => {
      await fetchEvents();

      if (state.hasBeenSetup && !state.accountExists) {
        for (;;) {
          setDisplayText("Checking if fee payer account exists...");
          console.log("Checking if fee payer account exists...");
          const res = await state.zkappWorkerClient!.fetchAccount({
            publicKey: state.publicKey!,
          });
          const accountExists = res.error == null;
          if (accountExists) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        setState({ ...state, accountExists: true });
      }
    })();
  }, [state.hasBeenSetup]);

  // -------------------------------------------------------
  // Submit Solution

  const onSubmitSolution = async () => {
    setState({ ...state, creatingTransaction: true });

    setDisplayText("Submitting a solution...");
    console.log("Submitting a solution...");

    await state.zkappWorkerClient!.fetchAccount({
      publicKey: state.publicKey!,
    });

    await state.zkappWorkerClient!.submitSolution({
      sender: state.publicKey!.toBase58(),
      sudokuRef: Number(selectedSudoku),
      sudoku,
      solution,
    });

    setDisplayText("Creating proof...");
    console.log("Creating proof...");
    await state.zkappWorkerClient!.proveUpdateTransaction();

    console.log("Requesting send transaction...");
    setDisplayText("Requesting send transaction...");
    const transactionJSON = await state.zkappWorkerClient!.getTransactionJSON();

    setDisplayText("Getting transaction JSON...");
    console.log("Getting transaction JSON...");
    const { hash } = await (window as any).mina.sendTransaction({
      transaction: transactionJSON,
      feePayer: {
        fee: transactionFee,
        memo: "",
      },
    });

    const transactionLink = `https://berkeley.minaexplorer.com/transaction/${hash}`;
    console.log(`View transaction at ${transactionLink}`);

    setTransactionLink(transactionLink);
    setDisplayText(transactionLink);

    setState({ ...state, creatingTransaction: false });
  };

  const fetchEvents = async () => {
    if (state.hasBeenSetup) {
      setSolved({
        total: 0,
        currentUser: 0,
        isLoaded: false,
      });

      // fetching events
      console.log("fetching events");
      setDisplayText("Getting puzzle statistics from contract events...");
      let events: any[] =
        (await state.zkappWorkerClient!.fetchEvents()) as any[];

      let currentUserSolvedCount = 0;
      let sudokuSolvedCount = 0;

      events.map((e) => {
        if (
          e.sudokuHash === state.sudokuHashes![selectedSudoku - 1].toString()
        ) {
          sudokuSolvedCount++;
          if (e.solver === state.publicKey!.toBase58())
            currentUserSolvedCount++;
        }
      });

      setSolved({
        total: sudokuSolvedCount,
        currentUser: currentUserSolvedCount,
        isLoaded: true,
      });
      setDisplayText("");
    }
  };

  // -------------------------------------------------------
  // Refresh the current state

  const onRefreshState = async () => {
    console.log("Getting zkApp state...");
    setDisplayText("Getting zkApp state...");

    await state.zkappWorkerClient!.fetchAccount({
      publicKey: state.zkappPublicKey!,
    });
    const sudokuHashes = await state.zkappWorkerClient!.getSudokuHashes();
    setState({ ...state, sudokuHashes });
    console.log(`Current state in zkApp: ${sudokuHashes[0].toString()}`);
    setDisplayText("");
  };

  // -------------------------------------------------------
  // Create UI elements

  let hasWallet;
  if (state.hasWallet != null && !state.hasWallet) {
    const auroLink = "https://www.aurowallet.com/";
    const auroLinkElem = (
      <a href={auroLink} target="_blank" rel="noreferrer">
        Install Auro wallet here
      </a>
    );
    hasWallet = <div>Could not find a wallet. {auroLinkElem}</div>;
  }

  const stepDisplay = transactionlink ? (
    <a href={displayText} target="_blank" rel="noreferrer">
      View transaction
    </a>
  ) : (
    displayText
  );

  let setup = (
    <div
      className={styles.start}
      style={{
        fontWeight: "bold",
        fontSize: "1rem",
        paddingTop: "2rem",
        paddingBottom: "2rem",
      }}
    >
      {stepDisplay}
      {hasWallet}
    </div>
  );

  let accountDoesNotExist;
  if (state.hasBeenSetup && !state.accountExists) {
    const faucetLink =
      "https://faucet.minaprotocol.com/?address=" + state.publicKey!.toBase58();
    accountDoesNotExist = (
      <div>
        <span style={{ paddingRight: "1rem" }}>Account does not exist.</span>
        <a href={faucetLink} target="_blank" rel="noreferrer">
          Visit the faucet to fund this fee payer account
        </a>
      </div>
    );
  }

  let mainContent;
  if (state.hasBeenSetup && state.accountExists) {
    mainContent = (
      <>
        <div style={{ justifyContent: "center", alignItems: "center" }}>
          <button
            className={styles.card}
            onClick={onSubmitSolution}
            disabled={state.creatingTransaction}
          >
            Submit Solution
          </button>
        </div>
        {/*
        <div style={{ justifyContent: "center", alignItems: "center" }}>
          <div className={styles.center} style={{ padding: 0 }}>
            Current state in zkApp: {state.sudokuHash!.toString()}{" "}
          </div>
          <button
            className={styles.card}
            onClick={onRefreshState}
          >
            Get Latest State
          </button>
        </div>
        */}
      </>
    );
  }

  let solvedContent;
  if (solved.isLoaded === true && solved.currentUser === 0) {
    solvedContent = (
      <>
        This sudoku has been solved {solved.total} times. BUT you haven't yet!
      </>
    );
  }

  if (solved.isLoaded === true && solved.currentUser > 0) {
    solvedContent = (
      <>
        This sudoku has been solved {solved.total} times. AND you have too!
      </>
    );
  }

  return (
    <>
      <div className={styles.main} style={{ padding: 0 }}>
        <div className={styles.center} style={{ padding: 0 }}>
          <h2 style={{ margin: "1rem" }}>Mina Puzzles: Sudoku Redux</h2>
          <div style={{ margin: "1rem" }}>
            <span style={{ marginRight: "1.5rem" }}>
              Choose Sudoku to solve:
            </span>
            <select
              value={selectedSudoku}
              onChange={(e) => {
                setSelectedSudoku(Number(e.target.value));
                setSudoku(sudokus[Number(e.target.value)]);
                setSolution(sudokus[Number(e.target.value)]);
                fetchEvents();
              }}
              style={{ padding: "0.2rem", fontSize: "1.1rem" }}
            >
              <option value="1">Sudoku 1</option>
              <option value="2">Sudoku 2</option>
              <option value="3">Sudoku 3</option>
              <option value="4">Sudoku 4</option>
            </select>
          </div>
          <SudokuTable
            sudoku={sudoku}
            editable
            solution={solution}
            setSolution={setSolution}
          />
          {mainContent}
          <hr />
          {solvedContent}
          {setup}
          {accountDoesNotExist}
        </div>
      </div>
    </>
  );
}
