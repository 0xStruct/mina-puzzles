import {
  Mina,
  PublicKey,
  fetchAccount,
  Struct,
  Field,
  Provable,
  ProvablePure,
  Poseidon,
  UInt32,
} from "o1js";

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

// ---------------------------------------------------------------------------------------

import type { SudokuZkApp } from "../contracts/sudoku";

type MinaEvent = {
  type: string;
  event: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: ProvablePure<any>;
    transactionInfo: {
      transactionHash: string;
      transactionStatus: string;
      transactionMemo: string;
    };
  };
  blockHeight: UInt32;
  blockHash: string;
  parentBlockHash: string;
  globalSlot: UInt32;
  chainStatus: string;
};

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
    const Berkeley = Mina.Network({
      mina: "https://proxy.berkeley.minaexplorer.com/graphql",
      archive: "https://archive.berkeley.minaexplorer.com",
    });
    console.log("Berkeley Instance Created");
    Mina.setActiveInstance(Berkeley);
  },
  loadContract: async (args: {}) => {
    const { SudokuZkApp } = await import(
      "../contracts/sudoku"
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
  fetchEvents: async (args: {}) => {
    const minaEvents: MinaEvent[] = await state.zkapp!.fetchEvents(
      UInt32.from(0)
    );

    let events: any[] = [];
    minaEvents.map((e) => {
      events.push({
        // @ts-ignore
        solver: e.event.data.solver.toBase58(),
        // @ts-ignore
        sudokuHash: e.event.data.sudokuHash.toJSON(),
      });
    });

    return events;
  },
  initZkappInstance: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    state.zkapp = new state.SudokuZkApp!(publicKey);
  },
  getSudokuHashes: async (args: {}) => {
    const sudokuHash1 = await state.zkapp!.sudokuHash1.get();
    const sudokuHash2 = await state.zkapp!.sudokuHash2.get();
    const sudokuHash3 = await state.zkapp!.sudokuHash3.get();
    const sudokuHash4 = await state.zkapp!.sudokuHash4.get();

    return JSON.stringify([
      sudokuHash1.toJSON(),
      sudokuHash2.toJSON(),
      sudokuHash3.toJSON(),
      sudokuHash4.toJSON()
    ]);
  },
  // createUpdateTransaction: async (args: {}) => {
  //   const transaction = await Mina.transaction(() => {
  //     state.zkapp!.update();
  //   });
  //   state.transaction = transaction;
  // },
  submitSolution: async (args: {
    sender: string;
    sudokuRef: number;
    sudoku: any;
    solution: any;
  }) => {
    const { sender, sudokuRef, sudoku, solution } = args;
    const transaction = await Mina.transaction(
      PublicKey.fromBase58(sender),
      () => {
        state.zkapp!.submitSolution(Field(Number(sudokuRef)), Sudoku.from(sudoku), Sudoku.from(solution));
      }
    );
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
