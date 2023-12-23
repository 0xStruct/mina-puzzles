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

import type { QuizZkApp } from "../../../contracts/src/Quiz";

const state = {
  QuizZkApp: null as null | typeof QuizZkApp,
  zkapp: null as null | QuizZkApp,
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
    const { QuizZkApp } = await import(
      "../../../contracts/build/src/Quiz.js"
    );
    state.QuizZkApp = QuizZkApp;
  },
  compileContract: async (args: {}) => {
    await state.QuizZkApp!.compile();
  },
  fetchAccount: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    return await fetchAccount({ publicKey });
  },
  initZkappInstance: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    state.zkapp = new state.QuizZkApp!(publicKey);
  },
  getSolutionHash: async (args: {}) => {
    const solutionHash = await state.zkapp!.solutionHash.get();
    return JSON.stringify(solutionHash.toJSON());
  },
  // createUpdateTransaction: async (args: {}) => {
  //   const transaction = await Mina.transaction(() => {
  //     state.zkapp!.update();
  //   });
  //   state.transaction = transaction;
  // },
  submitSolution: async (args: { sender: string, solution: any }) => {
    const { sender, solution } = args;
    const transaction = await Mina.transaction(PublicKey.fromBase58(sender), () => {
      state.zkapp!.submitSolution(
        Field(0),
        Field(0),
        Field(0)
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
