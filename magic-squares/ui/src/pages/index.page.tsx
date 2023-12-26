import { useEffect, useState } from "react";
import "./reactCOIServiceWorker";
import ZkappWorkerClient from "./zkappWorkerClient";
import { PublicKey, Field } from "o1js";
import MagicSquaresTable from "../components/MagicSquaresTable";
import styles from "../styles/Home.module.css";

let transactionFee = 0.1;
const ZKAPP_ADDRESS = process.env.NEXT_PUBLIC_ZKAPP_ADDRESS;

export default function Home() {
  const [state, setState] = useState({
    zkappWorkerClient: null as null | ZkappWorkerClient,
    hasWallet: null as null | boolean,
    hasBeenSetup: false,
    accountExists: false,
    puzzleHashes: null as null | Field[],
    publicKey: null as null | PublicKey,
    zkappPublicKey: null as null | PublicKey,
    creatingTransaction: false,
    puzzleRef: Number,
  });

  const [solved, setSolved] = useState({
    total: 0,
    currentUser: 0,
    isLoaded: false,
  });

  const [selectedPuzzle, setSelectedPuzzle] = useState(1);

  let puzzles = [
    [[]], // empty puzzle for index 0
    [
      [0, 24, 1, 8, 0],
      [23, 0, 7, 0, 16],
      [4, 6, 0, 20, 22],
      [10, 0, 19, 0, 3],
      [0, 18, 25, 2, 0],
    ],
    [
      [17, 0, 1, 8, 15],
      [23, 0, 7, 14, 16],
      [4, 0, 13, 20, 22],
      [10, 0, 19, 21, 3],
      [11, 0, 25, 2, 9],
    ],
    [
      [17, 24, 1, 0, 15],
      [23, 5, 7, 0, 16],
      [4, 6, 13, 0, 22],
      [10, 12, 19, 0, 3],
      [11, 18, 25, 0, 9],
    ],
    [
      [17, 24, 1, 8, 15],
      [0, 0, 0, 0, 0],
      [4, 6, 13, 20, 22],
      [10, 12, 19, 21, 3],
      [11, 18, 25, 2, 9],
    ],
  ];

  const [puzzle, setPuzzle] = useState(puzzles[1]);
  let [solution, setSolution] = useState(puzzles[1]);

  let bravo = [
    [17, 24, 1, 8, 15],
    [23, 5, 7, 14, 16],
    [4, 6, 13, 20, 22],
    [10, 12, 19, 21, 3],
    [11, 18, 25, 2, 9],
  ];
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

        // fetching events
        console.log("fetching events");
        setDisplayText("Getting puzzle statistics from contract events...");
        let events: any[] = (await zkappWorkerClient.fetchEvents()) as any[];

        let currentUserSolvedCount = 0;

        events.map((e) => {
          if (e.solver === publicKeyBase58) currentUserSolvedCount++;
        });

        setSolved({
          total: events.length,
          currentUser: currentUserSolvedCount,
          isLoaded: true,
        });
        setDisplayText("");

        console.log("Getting zkApp state...");
        setDisplayText("Getting zkApp state...");
        await zkappWorkerClient.fetchAccount({ publicKey: zkappPublicKey });
        const puzzleHashes = await zkappWorkerClient.getPuzzleHashes();
        console.log(`Current state in zkApp: ${puzzleHashes[0].toString()}`);
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
          puzzleHashes,
        });
      }
    })();
  }, []);

  // -------------------------------------------------------
  // Wait for account to exist, if it didn't

  useEffect(() => {
    (async () => {
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
      puzzleRef: Number(selectedPuzzle),
      puzzle,
      solution,
    });

    setDisplayText("Creating proof...");
    console.log("Creating proof...");
    await state.zkappWorkerClient!.proveTransaction();

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

  // -------------------------------------------------------
  // Refresh the current state

  const onRefreshState = async () => {
    console.log("Getting zkApp state...");
    setDisplayText("Getting zkApp state...");

    await state.zkappWorkerClient!.fetchAccount({
      publicKey: state.zkappPublicKey!,
    });
    const puzzleHashes = await state.zkappWorkerClient!.getPuzzleHashes();
    setState({ ...state, puzzleHashes });
    console.log(`Current state in zkApp: ${puzzleHashes[0].toString()}`);
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
            Current state in zkApp: {state.puzzleHash!.toString()}{" "}
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
        The puzzle has been solved {solved.total} times. BUT you haven't solved
        it yet.
      </>
    );
  }

  if (solved.isLoaded === true && solved.currentUser > 0) {
    solvedContent = (
      <>
        The puzzle has been solved {solved.total} times. AND you are one of
        them!.
      </>
    );
  }

  return (
    <>
      <div className={styles.main} style={{ padding: 0 }}>
        <div className={styles.center} style={{ padding: 0 }}>
          <h2 style={{ margin: "1rem" }}>Mina Puzzles: Magic Squares</h2>
          <div style={{ margin: "1rem" }}>
            <span style={{ marginRight: "1.5rem" }}>
              Choose Puzzle to solve:
            </span>
            <select
              value={selectedPuzzle}
              onChange={(e) => {
                setSelectedPuzzle(Number(e.target.value));
                setPuzzle(puzzles[Number(e.target.value)]);
                setSolution(puzzles[Number(e.target.value)]);
              }}
            >
              <option value="1">Puzzle 1</option>
              <option value="2">Puzzle 2</option>
              <option value="3">Puzzle 3</option>
              <option value="4">Puzzle 4</option>
            </select>
          </div>
          <MagicSquaresTable
            puzzle={puzzle}
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
