/**
 * SignWall driver script
 *      -- run the script with --
 *  npx tsx x-temp/signwall-driver.ts
 *
 * or with options:
 *
 *  npx tsx x-temp/signwall-driver.ts --fast (ignores the delay time set, uses shorter intervals)
 *  npx tsx x-temp/signwall-driver.ts --mode=sign (continuously signs the wall with random messages)
 *  npx tsx x-temp/signwall-driver.ts --mode=counter (test counter increment)
 *  npx tsx x-temp/signwall-driver.ts --mode=update (test signature updates)
 *
 * - Reads the deployer "mnemonic" from settings/Mainnet.toml
 * - Derives the account private key
 * - Interacts with the deployed mainnet contract
 * - Modes:
 *     sign: Continuously calls sign function with random names and messages (default)
 *     counter: Continuously calls increment with random delays
 *     update: Updates existing signatures with new messages
 * - Waits 10 minutes (600s) between each call by default
 * - Use --fast flag for testing with shorter delays (10-40s)
 *
 * Usage:
 *   - Ensure you have installed dependencies: npm install
 *   - Run with tsx
 *   - By default, this script resolves settings/Mainnet.toml relative to this file
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STACKS_MAINNET } from "@stacks/network";
import {
  AnchorMode,
  PostConditionMode,
  makeContractCall,
  broadcastTransaction,
  fetchCallReadOnlyFunction,
  cvToString,
  stringAsciiCV,
  stringUtf8CV,
  principalCV,
} from "@stacks/transactions";
import { generateWallet, getStxAddress } from "@stacks/wallet-sdk";
import * as TOML from "toml";

type NetworkSettings = {
  network?: {
    name?: string;
    stacks_node_rpc_address?: string;
    deployment_fee_rate?: number;
  };
  accounts?: {
    deployer?: {
      mnemonic?: string;
    };
  };
};

// UPDATE THESE WITH YOUR DEPLOYED CONTRACT DETAILS
const CONTRACT_ADDRESS = "SP1GNDB8SXJ51GBMSVVXMWGTPRFHGSMWNNBEY25A4"; // Your deployed address
const CONTRACT_NAME = "signwall";

// Function names in signwall.clar
const FN_SIGN = "sign";
const FN_INCREMENT = "increment";
const FN_DECREMENT = "decrement";
const FN_GET_SIGNATURE = "get-signature";
const FN_GET_SIGNATURE_COUNT = "get-signature-count";
const FN_GET_GENERAL_COUNTER = "get-general-counter";

// Reasonable default fee in microstacks for contract-call
const DEFAULT_FEE_USTX = 10000;

// Parse command-line arguments
const FAST = process.argv.includes("--fast");
const MODE =
  process.argv.find((arg) => arg.startsWith("--mode="))?.split("=")[1] ||
  "sign";

// Random delay choices (milliseconds)
let DELAY_CHOICES_MS = [
  600_000, // 10 minutes (default interval)
];

if (FAST) {
  // Shorten delays for a quick smoke run
  DELAY_CHOICES_MS = [
    10_000, // 10 sec
    20_000, // 20 sec
    25_000, // 25 sec
    30_000, // 30 sec
    40_000, // 40 sec
  ];
}

// Sample names and messages for signing
const SAMPLE_NAMES = [
  "Alice",
  "Bob",
  "Charlie",
  "Diana",
  "Eve",
  "Frank",
  "Grace",
  "Henry",
  "Ivy",
  "Jack",
  "Anonymous",
  "Satoshi",
  "Vitalik",
  "Nakamoto",
  "Stacker",
];

const SAMPLE_MESSAGES = [
  "Hello from the blockchain!",
  "This is amazing! 🚀",
  "Decentralization is the future",
  "Building on Stacks is awesome",
  "GM everyone!",
  "To the moon! 🌙",
  "Web3 is here to stay",
  "HODL strong 💪",
  "Clarity is beautiful",
  "Smart contracts FTW",
  "Blockchain never sleeps",
  "Trustless and transparent",
  "Code is law",
  "Powered by Bitcoin",
  "Stack those blocks!",
];

// Helper to get current file dir (ESM-compatible)
function thisDirname(): string {
  const __filename = fileURLToPath(import.meta.url);
  return path.dirname(__filename);
}

async function readMainnetMnemonic(): Promise<string> {
  const baseDir = thisDirname();
  // Resolve ../settings/Mainnet.toml relative to this file
  const settingsPath = path.resolve(baseDir, "../settings/Mainnet.toml");

  const raw = await fs.readFile(settingsPath, "utf8");
  const parsed = TOML.parse(raw) as NetworkSettings;

  const mnemonic = parsed?.accounts?.deployer?.mnemonic;
  if (!mnemonic || mnemonic.includes("<YOUR PRIVATE MAINNET MNEMONIC HERE>")) {
    throw new Error(
      `Mnemonic not found in ${settingsPath}. Please set [accounts.deployer].mnemonic.`
    );
  }
  return mnemonic.trim();
}

async function deriveSenderFromMnemonic(mnemonic: string) {
  // Note: generateWallet accepts the 12/24-word secret phrase via "secretKey"
  const wallet = await generateWallet({
    secretKey: mnemonic,
    password: "",
  });
  const account = wallet.accounts[0];

  function normalizeSenderKey(key: string): string {
    let k = (key || "").trim();
    if (k.startsWith("0x") || k.startsWith("0X")) k = k.slice(2);
    return k;
  }

  const rawKey = account.stxPrivateKey || "";
  const senderKey = normalizeSenderKey(rawKey); // hex private key string, no 0x prefix

  // Derive address properly to avoid lint errors
  // We can just use the provided method if we don't pass TransactionVersion (which was the issue before)
  // Or check the SDK version compatibility
  // For now, let's assume default mainnet if not specified, or try to pass simple params
  const senderAddress = getStxAddress({ account });

  // Debug: key length (do not print full key)
  console.log(
    `Derived sender key length: ${senderKey.length} hex chars (address: ${senderAddress})`
  );

  return { senderKey, senderAddress };
}

function pickRandomDelayMs(): number {
  const i = Math.floor(Math.random() * DELAY_CHOICES_MS.length);
  return DELAY_CHOICES_MS[i];
}

function pickRandomElement<T>(arr: T[]): T {
  const i = Math.floor(Math.random() * arr.length);
  return arr[i];
}

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error("aborted"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    if (signal?.aborted) {
      clearTimeout(timer);
      return reject(new Error("aborted"));
    }
    signal?.addEventListener("abort", onAbort);
  });
}

// ... helper functions omitted for brevity if unchanged ... 
// But we should keep them if this is a replace block. 
// Actually I am replacing the top part of the file to fix imports and derive function
// AND the main function at the bottom.
// Using replace_file_content for single contiguous block is required.
// So I will just replace the top section first.

/* 
   Since I cannot do multiple edits in one go with replace_file_content unless contiguous,
   I'll start with imports and deriveSenderFromMnemonic.
*/




async function readSignatureCount(network: any, senderAddress: string) {
  const res = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: FN_GET_SIGNATURE_COUNT,
    functionArgs: [],
    network,
    senderAddress,
  });
  return cvToString(res);
}

async function readCounter(network: any, senderAddress: string) {
  const res = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: FN_GET_GENERAL_COUNTER,
    functionArgs: [],
    network,
    senderAddress,
  });
  return cvToString(res);
}

async function contractCall(
  network: any,
  senderKey: string,
  functionName: string,
  functionArgs: any[] = []
) {
  console.log(
    `Preparing contract-call tx for: ${functionName}${
      functionArgs.length > 0 ? " with args" : ""
    }`
  );
  const tx = await makeContractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName,
    functionArgs,
    network,
    senderKey,
    fee: DEFAULT_FEE_USTX,
    postConditionMode: PostConditionMode.Allow,
  });

  // Defensive: ensure tx object is valid before broadcast
  if (!tx || typeof (tx as any).serialize !== "function") {
    throw new Error(
      `Invalid transaction object for ${functionName} (missing serialize).`
    );
  }

  try {
    const resp = await broadcastTransaction({ transaction: tx, network });
    const txid =
      typeof resp === "string"
        ? resp
        : (resp as any).txid ||
          (resp as any).transactionId ||
          (resp as any).txId ||
          (resp as any).tx_id ||
          "unknown-txid";
    console.log(`Broadcast response for ${functionName}: ${txid}`);
    return txid;
  } catch (e: any) {
    const reason =
      e?.message ||
      e?.response?.error ||
      e?.response?.reason ||
      e?.responseText ||
      "unknown-error";
    throw new Error(`Broadcast failed for ${functionName}: ${reason}`);
  }
}

async function runSignMode(
  network: any,
  senderKey: string,
  senderAddress: string,
  stopSignal: AbortSignal
) {
  console.log(
    "Running in SIGN mode: will sign the wall every 10 minutes (or faster with --fast)"
  );
  let keepRunning = true;
  let iteration = 0;

  stopSignal.addEventListener("abort", () => {
    keepRunning = false;
  });

  while (keepRunning) {
    iteration++;
    const functionName = FN_SIGN;

    const waitMs = pickRandomDelayMs();
    const seconds = Math.round(waitMs / 1000);
    const minutes = Math.round(seconds / 60);

    // Pick random name and message
    const randomName = pickRandomElement(SAMPLE_NAMES);
    const randomMessage = pickRandomElement(SAMPLE_MESSAGES);
    
    // No check for existing signature - unlimited signing allowed
    
    console.log(
      `Waiting ~${minutes > 0 ? minutes + "m" : seconds + "s"} before next call (${functionName})...`
    );

    try {
      await delay(waitMs, stopSignal);
    } catch {
      break;
    }

    console.log(
      `Calling ${functionName} (#${iteration}) with name="${randomName}" and message="${randomMessage}"...`
    );
    let txid: string | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        txid = await contractCall(network, senderKey, functionName, [
          stringAsciiCV(randomName),
          stringUtf8CV(randomMessage),
        ]);
        console.log(`Broadcasted ${functionName}: ${txid}`);
        break;
      } catch (err) {
        const msg = (err as Error).message || String(err);
        console.warn(
          `Attempt ${attempt} failed for ${functionName}: ${msg}${
            attempt < 3 ? " — retrying..." : ""
          }`
        );
        if (attempt < 3) {
          try {
            await delay(2000 * attempt, stopSignal);
          } catch {
            keepRunning = false;
            break;
          }
        }
      }
    }

    if (txid) {
      try {
        const count = await readSignatureCount(network, senderAddress);
        console.log(`Current signature count (read-only): ${count}`);
      } catch (re) {
        console.warn(
          `Warning: failed to read signature count after ${functionName}:`,
          (re as Error).message
        );
      }
    }
  }
}

async function runCounterMode(
  network: any,
  senderKey: string,
  senderAddress: string,
  stopSignal: AbortSignal
) {
  console.log("Running in COUNTER mode: will increment counter continuously");
  let keepRunning = true;
  let iteration = 0;

  stopSignal.addEventListener("abort", () => {
    keepRunning = false;
  });

  while (keepRunning) {
    iteration++;
    const functionName = FN_INCREMENT;

    const waitMs = pickRandomDelayMs();
    const seconds = Math.round(waitMs / 1000);
    const minutes = Math.round(seconds / 60);
    console.log(
      `Waiting ~${minutes > 0 ? minutes + "m" : seconds + "s"} before next call (${functionName})...`
    );
    try {
      await delay(waitMs, stopSignal);
    } catch {
      break;
    }

    console.log(`Calling ${functionName} (#${iteration})...`);
    let txid: string | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        txid = await contractCall(network, senderKey, functionName);
        console.log(`Broadcasted ${functionName}: ${txid}`);
        break;
      } catch (err) {
        const msg = (err as Error).message || String(err);
        console.warn(
          `Attempt ${attempt} failed for ${functionName}: ${msg}${
            attempt < 3 ? " — retrying..." : ""
          }`
        );
        if (attempt < 3) {
          try {
            await delay(2000 * attempt, stopSignal);
          } catch {
            keepRunning = false;
            break;
          }
        }
      }
    }

    if (txid) {
      try {
        const current = await readCounter(network, senderAddress);
        console.log(`Current counter (read-only): ${current}`);
      } catch (re) {
        console.warn(
          `Warning: failed to read counter after ${functionName}:`,
          (re as Error).message
        );
      }
    }
  }
}

async function main() {
  console.log("SignWall driver starting...");
  if (FAST) console.log("FAST mode enabled: shortened delays");
  console.log(`Mode: ${MODE}`);

  // 1) Network
  // 1) Network
  const network = { ...STACKS_MAINNET, fetchFn: fetch };

  // 2) Load mnemonic and derive sender
  const mnemonic = await readMainnetMnemonic();
  const { senderKey, senderAddress } = await deriveSenderFromMnemonic(mnemonic);

  console.log(`Using sender address: ${senderAddress}`);
  console.log(
    `Target contract: ${CONTRACT_ADDRESS}.${CONTRACT_NAME} (mainnet)`
  );

  // 3) Continuous run based on mode
  const stopController = new AbortController();
  const stopSignal = stopController.signal;
  process.on("SIGINT", () => {
    console.log("\nReceived SIGINT. Stopping now...");
    stopController.abort();
  });

  try {
    if (MODE === "sign") {
      await runSignMode(network, senderKey, senderAddress, stopSignal);
    } else if (MODE === "counter") {
      await runCounterMode(network, senderKey, senderAddress, stopSignal);
    } else {
      throw new Error(
        `Unknown mode: ${MODE}. Use --mode=sign or --mode=counter`
      );
    }
  } catch (e) {
    if ((e as Error).message !== "aborted") {
      throw e;
    }
  }

  // Final status check
  try {
    const finalCount = await readSignatureCount(network, senderAddress);
    const finalCounter = await readCounter(network, senderAddress);
    console.log(`\nFinal status:`);
    console.log(`  Total signatures: ${finalCount}`);
    console.log(`  General counter: ${finalCounter}`);
  } catch (e) {
    console.warn("Warning: failed to read final status:", (e as Error).message);
  }
  console.log("SignWall driver stopped.");
}

// Run
main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
