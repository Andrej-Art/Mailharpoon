import { describe, expect, it } from "vitest";
import { decodeHeader, encodeQuery } from "@/lib/net/doh";

describe("DNS wire format", () => {
  it("encodes an A query as in RFC 1035", () => {
    const q = encodeQuery("example.com");
    expect(Buffer.from(q).toString("base64")).toBe("AAABAAABAAAAAAAAB2V4YW1wbGUDY29tAAABAAE=");
  });

  it("reads RCODE and answer count from a response header", () => {
    // NXDOMAIN response header: flags 0x8183, QD=1, AN=0
    expect(decodeHeader(new Uint8Array([0, 0, 0x81, 0x83, 0, 1, 0, 0, 0, 0, 0, 0]))).toEqual({ rcode: 3, answers: 0 });
    expect(decodeHeader(new Uint8Array([0, 0, 0x81, 0x80, 0, 1, 0, 2, 0, 0, 0, 0]))).toEqual({ rcode: 0, answers: 2 });
  });

  it("rejects labels longer than 63 bytes", () => {
    expect(() => encodeQuery(`${"a".repeat(64)}.com`)).toThrow();
  });
});
