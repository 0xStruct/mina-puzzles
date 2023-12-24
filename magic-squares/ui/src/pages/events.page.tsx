import { useEffect, useState } from "react";
import "./reactCOIServiceWorker";
import ZkappWorkerClient from "./zkappWorkerClient";
import { PublicKey, Field, UInt32, ProvablePure } from "o1js";
import styles from "../styles/Home.module.css";

let transactionFee = 0.1;
const ZKAPP_ADDRESS = process.env.NEXT_PUBLIC_ZKAPP_ADDRESS;

export default function Events() {
  const [state, setState] = useState({
    zkappWorkerClient: null as null | ZkappWorkerClient,
    hasWallet: null as null | boolean,
    hasBeenSetup: false,
    accountExists: false,
    puzzleHash: null as null | Field,
    publicKey: null as null | PublicKey,
    zkappPublicKey: null as null | PublicKey,
    creatingTransaction: false,
  });

  const [solved, setSolved] = useState({
    total: 0,
    currentUser: 0,
    isLoaded: false,
  });

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

        // console.log("Compiling zkApp...");
        // setDisplayText("Compiling zkApp...");
        // await zkappWorkerClient.compileContract();
        // console.log("zkApp compiled");
        // setDisplayText("zkApp compiled...");

        const zkappPublicKey = PublicKey.fromBase58(ZKAPP_ADDRESS!);

        await zkappWorkerClient.initZkappInstance(zkappPublicKey);

        // fetching events
        console.log("fetching events");
        let events: any[] = await zkappWorkerClient.fetchEvents() as any[];

        let currentUserSolvedCount = 0;

        events.map((e) => {
          if(e.solver === publicKeyBase58) currentUserSolvedCount++;
        });

        setSolved({
          total: events.length,
          currentUser: currentUserSolvedCount,
          isLoaded: true,
        });

        console.log("Getting zkApp state...");
        setDisplayText("Getting zkApp state...");
        await zkappWorkerClient.fetchAccount({ publicKey: zkappPublicKey });
        const puzzleHash = await zkappWorkerClient.getPuzzleHash();
        console.log(`Current state in zkApp: ${puzzleHash.toString()}`);
        setDisplayText("");

        setState({
          ...state,
          zkappWorkerClient,
          hasWallet: true,
          hasBeenSetup: true,
          publicKey,
          zkappPublicKey,
          accountExists,
          puzzleHash,
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

  let solvedContent;
  if(solved.isLoaded === true) {
    solvedContent = <>The puzzle has been solved {solved.total} times. You have solved {solved.currentUser} times.</>;
  }
  if(solved.isLoaded === false) {
    solvedContent = <>Getting puzzle statistics from contract events.</>;
  }

  return (
    <>
      <div className={styles.main} style={{ padding: 0 }}>
        <div className={styles.center} style={{ padding: 0 }}>
          <h2 style={{ margin: "1rem" }}>Mina Puzzles: Magic Squares</h2>
          {solvedContent}
          <hr />
          {setup}
          {accountDoesNotExist}
        </div>
      </div>
    </>
  );
}
