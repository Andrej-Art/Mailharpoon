// Local forward proxy that every request of the headless browser has to pass.
// Chrome never resolves a host itself (see render.ts), so this proxy is the single place
// where names become addresses: each host is resolved here, every address must be public,
// and the connection goes to exactly the vetted address. That closes SSRF and DNS rebinding
// for the browser the same way safe-fetch.ts does for plain requests.
import { randomBytes } from "node:crypto";
import http from "node:http";
import net from "node:net";
import { BlockedTargetError, resolvePublic } from "./safe-fetch";

/** Marks a response the proxy refused, so the browser check can tell it from a real page. */
export const BLOCKED_HEADER = "x-egress-blocked";

const ALLOWED_PORTS = new Set([80, 443, 8080, 8443]);
const MAX_SOCKETS = 160; // client and upstream sides together

export interface EgressProxy {
  url: string;
  /** Requests refused because they pointed at a private or reserved address. */
  blocked: () => number;
  /** Value of BLOCKED_HEADER on refusals; random, so a site cannot fake a refusal. */
  token: string;
  bytes: () => number;
  close: () => Promise<void>;
}

export async function startEgressProxy({ maxBytes = 25_000_000 } = {}): Promise<EgressProxy> {
  const sockets = new Set<net.Socket>();
  let blocked = 0;
  let bytes = 0;
  const token = randomBytes(12).toString("hex");

  const track = (s: net.Socket) => {
    sockets.add(s);
    s.on("close", () => sockets.delete(s));
    s.on("error", () => {});
  };
  // Only upstream sockets count towards the download budget.
  const trackUpstream = (s: net.Socket) => {
    track(s);
    s.on("data", (d: Buffer) => {
      bytes += d.length;
      if (bytes > maxBytes) s.destroy();
    });
  };

  async function target(host: string, port: number) {
    if (!ALLOWED_PORTS.has(port)) throw new BlockedTargetError("port_not_allowed");
    if (sockets.size >= MAX_SOCKETS) throw new BlockedTargetError("too_many_connections");
    try {
      return await resolvePublic(host.replace(/^\[|\]$/g, ""));
    } catch (e) {
      if (e instanceof BlockedTargetError && e.message.startsWith("non_public")) blocked++;
      throw e;
    }
  }

  const server = http.createServer(async (req, res) => {
    // Plain HTTP arrives in absolute form: GET http://host/path HTTP/1.1
    let u: URL;
    try {
      u = new URL(req.url ?? "");
      if (u.protocol !== "http:") throw new Error("scheme");
    } catch {
      res.writeHead(400).end();
      return;
    }
    const port = Number(u.port || 80);
    try {
      const { address } = await target(u.hostname, port);
      const headers = { ...req.headers };
      for (const h of Object.keys(headers)) if (h.startsWith("proxy-")) delete headers[h];
      const upstream = http.request(
        { host: address, port, method: req.method, path: u.pathname + u.search, headers, setHost: false, timeout: 8000 },
        (up) => {
          res.writeHead(up.statusCode ?? 502, up.headers);
          up.pipe(res);
        },
      );
      upstream.on("socket", trackUpstream);
      upstream.on("timeout", () => upstream.destroy());
      upstream.on("error", () => res.headersSent ? res.destroy() : res.writeHead(502).end());
      req.pipe(upstream);
    } catch {
      res.writeHead(403, { [BLOCKED_HEADER]: token }).end();
    }
  });

  // HTTPS and WebSocket traffic: CONNECT host:443
  server.on("connect", async (req: http.IncomingMessage, client: net.Socket, head: Buffer) => {
    const m = (req.url ?? "").match(/^\[?([^\]]+?)\]?:(\d+)$/);
    if (!m) return client.end("HTTP/1.1 400 Bad Request\r\n\r\n");
    try {
      const { address } = await target(m[1], Number(m[2]));
      const upstream = net.connect({ host: address, port: Number(m[2]), timeout: 8000 }, () => {
        client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        if (head.length) upstream.write(head);
        upstream.pipe(client);
        client.pipe(upstream);
      });
      trackUpstream(upstream);
      upstream.on("timeout", () => upstream.destroy());
      upstream.on("close", () => client.destroy());
      client.on("close", () => upstream.destroy());
    } catch {
      client.end(`HTTP/1.1 403 Forbidden\r\n${BLOCKED_HEADER}: ${token}\r\n\r\n`);
    }
  });
  server.on("connection", track);

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as net.AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    blocked: () => blocked,
    token,
    bytes: () => bytes,
    close: () =>
      new Promise((resolve) => {
        for (const s of sockets) s.destroy();
        server.close(() => resolve());
      }),
  };
}
