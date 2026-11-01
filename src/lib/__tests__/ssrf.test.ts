import { describe, expect, it } from "vitest";
import { isPublicIp } from "@/lib/net/safe-fetch";

describe("isPublicIp", () => {
  it.each(["8.8.8.8", "142.251.153.119", "2606:4700:4700::1111", "::ffff:8.8.8.8"])("allows %s", (ip) => expect(isPublicIp(ip)).toBe(true));
  it.each(["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:169.254.169.254", "not-an-ip"])(
    "blocks %s",
    (ip) => expect(isPublicIp(ip)).toBe(false),
  );
});
