import { Mina, PublicKey, fetchAccount, Struct, Field, Provable, Poseidon } from "o1js";

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

// ---------------------------------------------------------------------------------------

import type { SudokuZkApp } from "../../../contracts/src/sudoku";

const state = {
  SudokuZkApp: null as null | typeof SudokuZkApp,
  zkapp: null as null | SudokuZkApp,
  transaction: null as null | Transaction,
};

class Sudoku extends Struct({
  value: Provable.Array(Provable.Array(Field, 9), 9),
}) {
  static from(value: number[][]) {
    return new Sudoku({ value: value.map((row) => row.map(Field)) });
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
    const { SudokuZkApp } = await import(
      "../../../contracts/build/src/sudoku.js"
    );
    state.SudokuZkApp = SudokuZkApp;
  },
  compileContract: async (args: {}) => {
    await state.SudokuZkApp!.compile();
  },
  fetchAccount: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    return await fetchAccount({ publicKey });
  },
  initZkappInstance: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    state.zkapp = new state.SudokuZkApp!(publicKey);
  },
  getSudokuHash: async (args: {}) => {
    const sudokuHash = await state.zkapp!.sudokuHash.get();
    return JSON.stringify(sudokuHash.toJSON());
  },
  // createUpdateTransaction: async (args: {}) => {
  //   const transaction = await Mina.transaction(() => {
  //     state.zkapp!.update();
  //   });
  //   state.transaction = transaction;
  // },
  submitSolution: async (args: { sudoku: any; solution: any }) => {
    const { sudoku, solution } = args;
    const transaction = await Mina.transaction(() => {
      state.zkapp!.submitSolution(Sudoku.from(sudoku), Sudoku.from(solution));
    });
    state.transaction = transaction;
  },
  proveUpdateTransaction: async (args: {}) => {
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
