import assert from "node:assert/strict";
import { createHmac } from "crypto";
import { describe, it } from "node:test";
import { verifyTranzilaResponseHash } from "./tranzila-response-hash";

describe("verifyTranzilaResponseHash", () => {
  it("matches the PHP hash_hmac sample from Tranzila docs", () => {
    const expected = createHmac("sha256", "top secret").update("payload data").digest("hex");
    assert.equal(expected, "966a9102fb76c62001543bb3666ed2024c3f033fc11226914b9ed1b8f1cd6348");
  });

  it("accepts HMAC of JSON without response_hash", () => {
    const rest = { Response: "000", sum: "10.00", goi_job: "job-1" };
    const hash = createHmac("sha256", "secret").update(JSON.stringify(rest)).digest("hex");
    assert.equal(verifyTranzilaResponseHash({ ...rest, response_hash: hash }, "secret"), true);
  });

  it("rejects a missing or wrong hash", () => {
    const body = { Response: "000", sum: "10.00" };
    assert.equal(verifyTranzilaResponseHash(body, "secret"), false);
    assert.equal(
      verifyTranzilaResponseHash({ ...body, response_hash: "00".repeat(32) }, "secret"),
      false,
    );
  });
});
