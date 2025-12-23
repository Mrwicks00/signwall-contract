import { Cl, ClarityType } from "@stacks/transactions";
import { describe, expect, it, beforeEach } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

describe("SignWall - Sign Function Tests", () => {
  it("allows a user to sign the wall", () => {
    const name = "Alice";
    const message = "Hello, World!";

    const signResponse = simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii(name), Cl.stringUtf8(message)],
      wallet1
    );

    expect(signResponse.result).toBeOk(Cl.bool(true));
  });

  it("emits event when user signs the wall", () => {
    const name = "Alice";
    const message = "Hello, World!";
    const currentBlock = simnet.blockHeight;

    const signResponse = simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii(name), Cl.stringUtf8(message)],
      wallet1
    );

    expect(signResponse.result).toBeOk(Cl.bool(true));

    // Check for print event
    const printEvents = signResponse.events.filter(
      (e) => e.event === "print_event"
    );
    expect(printEvents).toHaveLength(1);
    expect(printEvents[0].data.value).toStrictEqual(
      Cl.tuple({
        event: Cl.stringAscii("new-signature"),
        signer: Cl.principal(wallet1),
        name: Cl.stringAscii(name),
        message: Cl.stringUtf8(message),
        "signature-id": Cl.uint(0),
        "total-signatures": Cl.uint(1),
        height: Cl.uint(currentBlock),
      })
    );
  });

  it("prevents user from signing twice", () => {
    const name = "Alice";
    const message = "Hello, World!";

    simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii(name), Cl.stringUtf8(message)],
      wallet1
    );

    const secondSignResponse = simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii("Alice Again"), Cl.stringUtf8("Second message")],
      wallet1
    );

    // Should return ERR_ALREADY_SIGNED (err u100)
    expect(secondSignResponse.result).toBeErr(Cl.uint(100));
  });

  it("rejects empty name", () => {
    const name = "";
    const message = "Hello, World!";

    const signResponse = simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii(name), Cl.stringUtf8(message)],
      wallet1
    );

    // Should return ERR_EMPTY_MESSAGE (err u104)
    expect(signResponse.result).toBeErr(Cl.uint(104));
  });

  it("allows multiple different users to sign", () => {
    const signResponse1 = simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii("Alice"), Cl.stringUtf8("First message")],
      wallet1
    );

    const signResponse2 = simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii("Bob"), Cl.stringUtf8("Second message")],
      wallet2
    );

    const signResponse3 = simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii("Charlie"), Cl.stringUtf8("Third message")],
      wallet3
    );

    expect(signResponse1.result).toBeOk(Cl.bool(true));
    expect(signResponse2.result).toBeOk(Cl.bool(true));
    expect(signResponse3.result).toBeOk(Cl.bool(true));
  });

  it("increments signature count correctly", () => {
    simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii("Alice"), Cl.stringUtf8("Message 1")],
      wallet1
    );

    simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii("Bob"), Cl.stringUtf8("Message 2")],
      wallet2
    );

    const count = simnet.callReadOnlyFn(
      "signwall",
      "get-signature-count",
      [],
      deployer
    );

    expect(count.result).toStrictEqual(Cl.uint(2));
  });

  it("allows UTF-8 characters in messages", () => {
    const name = "Alice";
    const message = "Hello 👋 World 🌍!";

    const signResponse = simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii(name), Cl.stringUtf8(message)],
      wallet1
    );

    expect(signResponse.result).toBeOk(Cl.bool(true));
  });

  it("handles maximum length name and message", () => {
    const name = "A".repeat(50); // Max 50 chars
    const message = "M".repeat(500); // Max 500 chars

    const signResponse = simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii(name), Cl.stringUtf8(message)],
      wallet1
    );

    expect(signResponse.result).toBeOk(Cl.bool(true));
  });
});

describe("SignWall - Update Signature Tests", () => {
  it("allows user to update their signature", () => {
    // First sign
    simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii("Alice"), Cl.stringUtf8("Original message")],
      wallet1
    );

    // Then update
    const updateResponse = simnet.callPublicFn(
      "signwall",
      "update-signature",
      [Cl.stringAscii("Alice Updated"), Cl.stringUtf8("Updated message")],
      wallet1
    );

    expect(updateResponse.result).toBeOk(Cl.bool(true));
  });

  it("emits event when updating signature", () => {
    const currentBlock = simnet.blockHeight;
    
    // First sign
    simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii("Alice"), Cl.stringUtf8("Original message")],
      wallet1
    );

    // Then update
    const updateResponse = simnet.callPublicFn(
      "signwall",
      "update-signature",
      [Cl.stringAscii("Alice Updated"), Cl.stringUtf8("Updated message")],
      wallet1
    );

    expect(updateResponse.result).toBeOk(Cl.bool(true));

    // Check for print event
    const printEvents = updateResponse.events.filter(
      (e) => e.event === "print_event"
    );
    expect(printEvents).toHaveLength(1);
    expect(printEvents[0].data.value).toStrictEqual(
      Cl.tuple({
        event: Cl.stringAscii("updated-signature"),
        signer: Cl.principal(wallet1),
        "new-name": Cl.stringAscii("Alice Updated"),
        "new-message": Cl.stringUtf8("Updated message"),
        "updated-at": Cl.uint(currentBlock),
      })
    );
  });

  it("prevents update if user hasn't signed yet", () => {
    const updateResponse = simnet.callPublicFn(
      "signwall",
      "update-signature",
      [Cl.stringAscii("Alice"), Cl.stringUtf8("Message")],
      wallet1
    );

    // Should return ERR_NOT_SIGNED_YET (err u101)
    expect(updateResponse.result).toBeErr(Cl.uint(101));
  });

  it("updates signature data correctly", () => {
    const currentBlock = simnet.blockHeight;
    
    // First sign
    simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii("Alice"), Cl.stringUtf8("Original message")],
      wallet1
    );

    // Then update
    simnet.callPublicFn(
      "signwall",
      "update-signature",
      [Cl.stringAscii("Alice Updated"), Cl.stringUtf8("Updated message")],
      wallet1
    );

    // Verify updated data
    const signature = simnet.callReadOnlyFn(
      "signwall",
      "get-signature",
      [Cl.principal(wallet1)],
      deployer
    );

    expect(signature.result).toBeSome(
      Cl.tuple({
        name: Cl.stringAscii("Alice Updated"),
        message: Cl.stringUtf8("Updated message"),
        "block-height": Cl.uint(currentBlock),
        "signature-id": Cl.uint(0),
      })
    );
  });

  it("maintains signature-id after update", () => {
    const currentBlock = simnet.blockHeight;
    // First sign
    simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii("Alice"), Cl.stringUtf8("Original")],
      wallet1
    );

    const originalSig = simnet.callReadOnlyFn(
      "signwall",
      "get-signature",
      [Cl.principal(wallet1)],
      deployer
    );

    expect(originalSig.result).toBeSome(
      Cl.tuple({
        name: Cl.stringAscii("Alice"),
        message: Cl.stringUtf8("Original"),
        "block-height": Cl.uint(currentBlock),
        "signature-id": Cl.uint(0),
      })
    );

    // Update
    simnet.callPublicFn(
      "signwall",
      "update-signature",
      [Cl.stringAscii("Alice Updated"), Cl.stringUtf8("Updated")],
      wallet1
    );

    const updatedSig = simnet.callReadOnlyFn(
      "signwall",
      "get-signature",
      [Cl.principal(wallet1)],
      deployer
    );
    
    expect(updatedSig.result).toBeSome(
      Cl.tuple({
        name: Cl.stringAscii("Alice Updated"),
        message: Cl.stringUtf8("Updated"),
        "block-height": Cl.uint(currentBlock),
        "signature-id": Cl.uint(0),
      })
    );
  });
});

describe("SignWall - Counter Tests", () => {
  it("allows incrementing the general counter", () => {
    const incrementResponse = simnet.callPublicFn(
      "signwall",
      "increment",
      [],
      wallet1
    );

    expect(incrementResponse.result).toBeOk(Cl.uint(1));
  });

  it("emits event when incrementing counter", () => {
    const incrementResponse = simnet.callPublicFn(
      "signwall",
      "increment",
      [],
      wallet1
    );

    expect(incrementResponse.result).toBeOk(Cl.uint(1));

    // Check for print event
    const printEvents = incrementResponse.events.filter(
      (e) => e.event === "print_event"
    );
    expect(printEvents).toHaveLength(1);
    expect(printEvents[0].data.value).toStrictEqual(
      Cl.tuple({
        event: Cl.stringAscii("counter-increment"),
        caller: Cl.principal(wallet1),
        "new-value": Cl.uint(1),
      })
    );
  });

  it("allows multiple increments", () => {
    simnet.callPublicFn("signwall", "increment", [], wallet1);
    simnet.callPublicFn("signwall", "increment", [], wallet2);
    const incrementResponse = simnet.callPublicFn(
      "signwall",
      "increment",
      [],
      wallet3
    );

    expect(incrementResponse.result).toBeOk(Cl.uint(3));
  });

  it("allows decrementing the counter", () => {
    simnet.callPublicFn("signwall", "increment", [], wallet1);
    simnet.callPublicFn("signwall", "increment", [], wallet1);

    const decrementResponse = simnet.callPublicFn(
      "signwall",
      "decrement",
      [],
      wallet1
    );

    expect(decrementResponse.result).toBeOk(Cl.uint(1));
  });

  it("emits event when decrementing counter", () => {
    simnet.callPublicFn("signwall", "increment", [], wallet1);
    simnet.callPublicFn("signwall", "increment", [], wallet1);

    const decrementResponse = simnet.callPublicFn(
      "signwall",
      "decrement",
      [],
      wallet1
    );

    expect(decrementResponse.result).toBeOk(Cl.uint(1));

    // Check for print event
    const printEvents = decrementResponse.events.filter(
      (e) => e.event === "print_event"
    );
    expect(printEvents).toHaveLength(1);
    expect(printEvents[0].data.value).toStrictEqual(
      Cl.tuple({
        event: Cl.stringAscii("counter-decrement"),
        caller: Cl.principal(wallet1),
        "new-value": Cl.uint(1),
      })
    );
  });

  it("prevents underflow when decrementing at zero", () => {
    const decrementResponse = simnet.callPublicFn(
      "signwall",
      "decrement",
      [],
      wallet1
    );

    // Should return ERR_UNDERFLOW (err u103)
    expect(decrementResponse.result).toBeErr(Cl.uint(103));
  });

  it("returns the current counter value", () => {
    simnet.callPublicFn("signwall", "increment", [], wallet1);
    simnet.callPublicFn("signwall", "increment", [], wallet1);

    const counterValue = simnet.callReadOnlyFn(
      "signwall",
      "get-general-counter",
      [],
      deployer
    );

    expect(counterValue.result).toStrictEqual(Cl.uint(2));
  });
});

describe("SignWall - Read-Only Function Tests", () => {
  it("returns signature by principal", () => {
    const currentBlock = simnet.blockHeight;
    
    simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii("Alice"), Cl.stringUtf8("Hello!")],
      wallet1
    );

    const signature = simnet.callReadOnlyFn(
      "signwall",
      "get-signature",
      [Cl.principal(wallet1)],
      deployer
    );

    expect(signature.result).toBeSome(
      Cl.tuple({
        name: Cl.stringAscii("Alice"),
        message: Cl.stringUtf8("Hello!"),
        "block-height": Cl.uint(currentBlock),
        "signature-id": Cl.uint(0),
      })
    );
  });

  it("returns none for unsigned user", () => {
    const signature = simnet.callReadOnlyFn(
      "signwall",
      "get-signature",
      [Cl.principal(wallet1)],
      deployer
    );

    expect(signature.result).toBeNone();
  });

  it("returns signature by index", () => {
    const currentBlock = simnet.blockHeight;
    
    simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii("Alice"), Cl.stringUtf8("First")],
      wallet1
    );

    simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii("Bob"), Cl.stringUtf8("Second")],
      wallet2
    );

    const signature0 = simnet.callReadOnlyFn(
      "signwall",
      "get-signature-by-index",
      [Cl.uint(0)],
      deployer
    );

    const signature1 = simnet.callReadOnlyFn(
      "signwall",
      "get-signature-by-index",
      [Cl.uint(1)],
      deployer
    );

    expect(signature0.result).toBeSome(
      Cl.tuple({
        name: Cl.stringAscii("Alice"),
        message: Cl.stringUtf8("First"),
        "block-height": Cl.uint(currentBlock),
        "signature-id": Cl.uint(0),
      })
    );

    expect(signature1.result).toBeSome(
      Cl.tuple({
        name: Cl.stringAscii("Bob"),
        message: Cl.stringUtf8("Second"),
        "block-height": Cl.uint(currentBlock),
        "signature-id": Cl.uint(1),
      })
    );
  });

  it("returns none for invalid index", () => {
    const signature = simnet.callReadOnlyFn(
      "signwall",
      "get-signature-by-index",
      [Cl.uint(999)],
      deployer
    );

    expect(signature.result).toBeNone();
  });

  it("returns correct signature count", () => {
    simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii("Alice"), Cl.stringUtf8("Message")],
      wallet1
    );

    simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii("Bob"), Cl.stringUtf8("Message")],
      wallet2
    );

    const count = simnet.callReadOnlyFn(
      "signwall",
      "get-signature-count",
      [],
      deployer
    );

    expect(count.result).toStrictEqual(Cl.uint(2));
  });

  it("returns zero count when no signatures", () => {
    const count = simnet.callReadOnlyFn(
      "signwall",
      "get-signature-count",
      [],
      deployer
    );

    expect(count.result).toStrictEqual(Cl.uint(0));
  });

  it("correctly checks if user has signed", () => {
    simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii("Alice"), Cl.stringUtf8("Message")],
      wallet1
    );

    const hasSigned1 = simnet.callReadOnlyFn(
      "signwall",
      "has-signed",
      [Cl.principal(wallet1)],
      deployer
    );

    const hasSigned2 = simnet.callReadOnlyFn(
      "signwall",
      "has-signed",
      [Cl.principal(wallet2)],
      deployer
    );

    expect(hasSigned1.result).toStrictEqual(Cl.bool(true));
    expect(hasSigned2.result).toStrictEqual(Cl.bool(false));
  });
});

describe("SignWall - Integration Tests", () => {
  it("handles complete signing workflow with multiple users", () => {
    const currentBlock = simnet.blockHeight;
    
    // Multiple users sign
    simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii("Alice"), Cl.stringUtf8("Great app!")],
      wallet1
    );

    simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii("Bob"), Cl.stringUtf8("Nice work!")],
      wallet2
    );

    simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii("Charlie"), Cl.stringUtf8("Love it!")],
      wallet3
    );

    // Check count
    const count = simnet.callReadOnlyFn(
      "signwall",
      "get-signature-count",
      [],
      deployer
    );
    expect(count.result).toStrictEqual(Cl.uint(3));

    // Update one signature
    simnet.callPublicFn(
      "signwall",
      "update-signature",
      [Cl.stringAscii("Alice Smith"), Cl.stringUtf8("Updated: Amazing!")],
      wallet1
    );

    // Verify update maintained signature-id
    const aliceSignature = simnet.callReadOnlyFn(
      "signwall",
      "get-signature-by-index",
      [Cl.uint(0)],
      deployer
    );

    expect(aliceSignature.result).toBeSome(
      Cl.tuple({
        name: Cl.stringAscii("Alice Smith"),
        message: Cl.stringUtf8("Updated: Amazing!"),
        "block-height": Cl.uint(currentBlock),
        "signature-id": Cl.uint(0),
      })
    );
  });

  it("handles counter operations independently of signatures", () => {
    // Sign some signatures
    simnet.callPublicFn(
      "signwall",
      "sign",
      [Cl.stringAscii("Alice"), Cl.stringUtf8("Message")],
      wallet1
    );

    // Increment counter
    simnet.callPublicFn("signwall", "increment", [], wallet1);
    simnet.callPublicFn("signwall", "increment", [], wallet2);

    // Check both are independent
    const signatureCount = simnet.callReadOnlyFn(
      "signwall",
      "get-signature-count",
      [],
      deployer
    );

    const counterValue = simnet.callReadOnlyFn(
      "signwall",
      "get-general-counter",
      [],
      deployer
    );

    expect(signatureCount.result).toStrictEqual(Cl.uint(1));
    expect(counterValue.result).toStrictEqual(Cl.uint(2));
  });
});