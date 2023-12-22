import { useEffect, useState } from "react";
import "./reactCOIServiceWorker";
import ZkappWorkerClient from "./zkappWorkerClient";
import { PublicKey, Field } from "o1js";
import Avatars from "../components/Avatars";
import styles from "../styles/Home.module.css";

let transactionFee = 0.1;
const ZKAPP_ADDRESS = process.env.NEXT_PUBLIC_ZKAPP_ADDRESS;

export default function Home() {
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

  // 10 x 8 grid - each time it is random to make it more fun
  // Array.from({length: 80}, () => Math.floor(Math.random() * 99999));
  // let avatarIDs = [
  //   35736, 86334, 45192, 17268, 5046, 92529, 40002, 77136, 83175, 46103, 76468,
  //   37908, 18344, 74040, 14138, 49405, 75239, 37183, 49295, 46455, 21944, 7721,
  //   34939, 91094, 23783, 25872, 48955, 15949, 83951, 73058, 84898, 35512, 87879,
  //   53402, 31433, 62706, 25611, 6133, 55750, 69671, 31887, 20987, 90734, 84322,
  //   13760, 81404, 51586, 49258, 91251, 42430, 13000, 11757, 11772, 84107, 18859,
  //   56570, 12079, 85214, 31575, 73369, 68595, 12215, 7981, 92419, 48211, 13740,
  //   94356, 24887, 97604, 73976, 66301, 13890, 41333, 59972, 62818, 45187, 14079,
  //   58392, 3169, 63474,
  // ];

  // let avatars = [];
  // for (let r = 0; r < 6; r++) {
  //   let randomIndex = Math.floor(Math.random() * 18); // between 1 to 18
  //   avatars.push(avatarIDs.splice(randomIndex, 10));
  // }
  // avatars.push(avatarIDs.splice(4, 10));
  // avatars.push(avatarIDs);

  // run above commented out code to generate arrays
  const avatars = [[5046,92529,40002,77136,83175,46103,76468,37908,18344,74040],[49295,46455,21944,7721,34939,91094,23783,25872,48955,15949],[25611,6133,55750,69671,31887,20987,90734,84322,13760,81404],[83951,73058,84898,35512,87879,53402,31433,62706,51586,49258],[75239,37183,91251,42430,13000,11757,11772,84107,18859,56570],[17268,14138,49405,12079,85214,31575,73369,68595,12215,7981],[48211,13740,94356,24887,97604,73976,66301,13890,41333,59972],[35736,86334,45192,92419,62818,45187,14079,58392,3169,63474]];

  let [solution, setSolution] = useState(0);

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
        const puzzleHash = await zkappWorkerClient.getSolutionHash();
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
  // Submit Solution

  const onSubmitSolution = async () => {
    setState({ ...state, creatingTransaction: true });

    setDisplayText("Submitting a solution...");
    console.log("Submitting a solution...");

    await state.zkappWorkerClient!.fetchAccount({
      publicKey: state.publicKey!,
    });

    await state.zkappWorkerClient!.submitSolution({sender: state.publicKey!.toBase58(), solution});

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
    const puzzleHash = await state.zkappWorkerClient!.getSolutionHash();
    setState({ ...state, puzzleHash });
    console.log(`Current state in zkApp: ${puzzleHash.toString()}`);
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
            Current state in zkApp: {state.puzzleHash!.toString()}{" "}
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
          <h2 style={{ margin: "1rem" }}>Mina Puzzles: Where is Mina?</h2>
          <div style={{ display: "flex" }}>
            <div>
              <svg viewBox="0 0 36 36" fill="none" role="img" xmlns="http://www.w3.org/2000/svg" width="80" height="80"><mask id=":r7:" maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36"><rect width="36" height="36" fill="#FFFFFF"></rect></mask><g mask="url(#:r7:)"><rect width="36" height="36" fill="#fbe5ac"></rect><rect x="0" y="0" width="36" height="36" transform="translate(8 8) rotate(78 18 18) scale(1)" fill="#a2bc97" rx="6"></rect><g transform="translate(4 4) rotate(-8 18 18)"><path d="M13,19 a1,0.75 0 0,0 10,0" fill="#000000"></path><rect x="11" y="14" width="1.5" height="2" rx="1" stroke="none" fill="#000000"></rect><rect x="23" y="14" width="1.5" height="2" rx="1" stroke="none" fill="#000000"></rect></g></g></svg>
            </div>
            <div style={{ padding: "4px", paddingTop: "10px", fontSize: "1.2rem" }}>← This is Mina!<br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Find it quick!</div>
          </div>
          <hr />
          <Avatars
            avatars={avatars}
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
