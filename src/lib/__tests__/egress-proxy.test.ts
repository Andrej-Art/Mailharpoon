import http from "node:http";
import net from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startEgressProxy, type EgressProxy } from "@/lib/net/egress-proxy";

let proxy: EgressProxy;
let port: number;
beforeAll(async () => {
  proxy = await startEgressProxy();
  port = Number(new URL(proxy.url).port);
});
afterAll(() => proxy.close());

function connect(target: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const s = net.connect(port, "127.0.0.1", () => s.write(`CONNECT ${target} HTTP/1.1\r\nHost: ${target}\r\n\r\n`));
    s.once("data", (d) => {
      resolve(d.toString().split("\r\n")[0]);
      s.destroy();
    });
    s.on("error", reject);
  });
}

function get(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    http.get({ host: "127.0.0.1", port, path: url, headers: { host: new URL(url).host } }, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    }).on("error", reject);
  });
}

describe("egress proxy for the headless browser", () => {
  it("refuses tunnels to loopback, link-local and private addresses", async () => {
    for (const t of ["127.0.0.1:443", "[::1]:443", "169.254.169.254:443", "10.0.0.1:443", "192.168.1.1:443", "localhost:443"]) {
      expect(await connect(t)).toMatch(/403/);
    }
    expect(proxy.blocked()).toBeGreaterThanOrEqual(6);
  });

  it("refuses plain HTTP to internal hosts and odd ports", async () => {
    expect(await get("http://127.0.0.1/")).toBe(403);
    expect(await get("http://169.254.169.254/latest/meta-data/")).toBe(403);
    expect(await connect("example.com:22")).toMatch(/403/);
  });
});
