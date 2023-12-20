import { useEffect, useState } from "react";
import "./reactCOIServiceWorker";
import ZkappWorkerClient from "./zkappWorkerClient";
import { PublicKey, Field } from "o1js";
import SudokuTable from "../components/SudokuTable";
import styles from "../styles/Home.module.css";
import { solveSudoku } from "../../../contracts/build/src/sudoku-lib";

let transactionFee = 0.1;
const ZKAPP_ADDRESS = process.env.NEXT_PUBLIC_ZKAPP_ADDRESS;

export default function Home() {
  const [state, setState] = useState({
    zkappWorkerClient: null as null | ZkappWorkerClient,
    hasWallet: null as null | boolean,
    hasBeenSetup: false,
    accountExists: false,
    sudokuHash: null as null | Field,
    publicKey: null as null | PublicKey,
    zkappPublicKey: null as null | PublicKey,
    creatingTransaction: false,
  });

  let sudoku = [
    [0, 0, 0, 0, 0, 0, 4, 5, 0],
    [6, 2, 0, 0, 0, 9, 8, 0, 7],
    [0, 0, 8, 0, 3, 2, 0, 9, 6],
    [2, 0, 0, 0, 6, 5, 0, 4, 1],
    [9, 1, 0, 7, 0, 0, 6, 0, 0],
    [0, 0, 6, 4, 0, 1, 7, 0, 0],
    [7, 0, 9, 3, 0, 6, 0, 0, 8],
    [5, 8, 0, 9, 1, 0, 3, 6, 4],
    [1, 6, 0, 0, 0, 4, 0, 0, 0],
  ];
  let [solution, setSolution] = useState(sudoku);

  let bravo = solveSudoku(sudoku)!;
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

        console.log("Compiling zkApp...");
        setDisplayText("Compiling zkApp...");
        await zkappWorkerClient.compileContract();
        console.log("zkApp compiled");
        setDisplayText("zkApp compiled...");

        const zkappPublicKey = PublicKey.fromBase58(ZKAPP_ADDRESS!);

        await zkappWorkerClient.initZkappInstance(zkappPublicKey);

        console.log("Getting zkApp state...");
        setDisplayText("Getting zkApp state...");
        await zkappWorkerClient.fetchAccount({ publicKey: zkappPublicKey });
        const sudokuHash = await zkappWorkerClient.getSudokuHash();
        console.log(`Current state in zkApp: ${sudokuHash.toString()}`);
        setDisplayText("");

        setState({
          ...state,
          zkappWorkerClient,
          hasWallet: true,
          hasBeenSetup: true,
          publicKey,
          zkappPublicKey,
          accountExists,
          sudokuHash,
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

    await state.zkappWorkerClient!.submitSolution({sender: state.publicKey!.toBase58(), sudoku, solution});

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

  // -------------------------------------------------------
  // Refresh the current state

  const onRefreshState = async () => {
    console.log("Getting zkApp state...");
    setDisplayText("Getting zkApp state...");

    await state.zkappWorkerClient!.fetchAccount({
      publicKey: state.zkappPublicKey!,
    });
    const sudokuHash = await state.zkappWorkerClient!.getSudokuHash();
    setState({ ...state, sudokuHash });
    console.log(`Current state in zkApp: ${sudokuHash.toString()}`);
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
        {/*<div style={{ justifyContent: "center", alignItems: "center" }}>
          <div className={styles.center} style={{ padding: 0 }}>
            Current state in zkApp: {state.sudokuHash!.toString()}{" "}
          </div>
          <button
            className={styles.card}
            onClick={onRefreshState}
          >
            Get Latest State
          </button>
    </div>*/}
      </>
    );
  }

  return (
    <>
      <div className={styles.main} style={{ padding: 0 }}>
        <div className={styles.center} style={{ padding: 0 }}>
          <h2 style={{ margin: "1rem" }}>Mina Puzzles: Sudoku Redux</h2>
          <SudokuTable
            sudoku={sudoku}
            editable
            solution={solution}
            setSolution={setSolution}
          />
          {mainContent}
          <hr />
          {setup}
          {accountDoesNotExist}
        </div>
      </div>
    </>
  );
}
