import {
  Mina,
  PublicKey,
  PrivateKey,
  fetchAccount,
  Struct,
  Field,
  Provable,
  Poseidon,
} from "o1js";

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

// ---------------------------------------------------------------------------------------

import type { MagicSquaresZkApp } from "../../../contracts/src/MagicSquares";

const state = {
  MagicSquaresZkApp: null as null | typeof MagicSquaresZkApp,
  zkapp: null as null | MagicSquaresZkApp,
  transaction: null as null | Transaction,
};

class PuzzleStruct extends Struct({
  value: Provable.Array(Provable.Array(Field, 5), 5),
}) {
  static from(value: number[][]) {
    return new PuzzleStruct({ value: value.map((row) => row.map(Field)) });
  }
  hash() {
    return Poseidon.hash(this.value.flat());
  }
}

// ---------------------------------------------------------------------------------------

const functions = {
  setActiveInstanceToBerkeley: async (args: {}) => {
    const Berkeley = Mina.Network(
      "https://proxy.berkeley.minaexplorer.com/graphql"
    );
    console.log("Berkeley Instance Created");
    Mina.setActiveInstance(Berkeley);
  },
  loadContract: async (args: {}) => {
    const { MagicSquaresZkApp } = await import(
      "../../../contracts/build/src/MagicSquares.js"
    );
    state.MagicSquaresZkApp = MagicSquaresZkApp;
  },
  compileContract: async (args: {}) => {
    await state.MagicSquaresZkApp!.compile();
  },
  fetchAccount: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    return await fetchAccount({ publicKey });
  },
  initZkappInstance: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    state.zkapp = new state.MagicSquaresZkApp!(publicKey);
  },
  getPuzzleHash: async (args: {}) => {
    const puzzleHash = await state.zkapp!.puzzleHash.get();
    return JSON.stringify(puzzleHash.toJSON());
  },
  // createUpdateTransaction: async (args: {}) => {
  //   const transaction = await Mina.transaction(() => {
  //     state.zkapp!.update();
  //   });
  //   state.transaction = transaction;
  // },
  submitSolution: async (args: { sender: string, puzzle: any; solution: any }) => {
    const { sender, puzzle, solution } = args;
    const transaction = await Mina.transaction(PublicKey.fromBase58(sender), () => {
      state.zkapp!.submitSolution(
        PuzzleStruct.from(puzzle),
        PuzzleStruct.from(solution)
      );
    });
    state.transaction = transaction;
  },
  proveTransaction: async (args: {}) => {
    await state.transaction!.prove();
  },
  getTransactionJSON: async (args: {}) => {
    return state.transaction!.toJSON();
  },
};

// ---------------------------------------------------------------------------------------

export type WorkerFunctions = keyof typeof functions;

export type ZkappWorkerRequest = {
  id: number;
  fn: WorkerFunctions;
  args: any;
};

export type ZkappWorkerReponse = {
  id: number;
  data: any;
};

if (typeof window !== "undefined") {
  addEventListener(
    "message",
    async (event: MessageEvent<ZkappWorkerRequest>) => {
      const returnData = await functions[event.data.fn](event.data.args);

      const message: ZkappWorkerReponse = {
        id: event.data.id,
        data: returnData,
      };
      postMessage(message);
    }
  );
}

console.log("Web Worker Successfully Initialized.");
