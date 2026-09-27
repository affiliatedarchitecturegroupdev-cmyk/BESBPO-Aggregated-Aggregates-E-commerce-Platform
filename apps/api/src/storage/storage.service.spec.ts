import { createServer, type IncomingMessage, type Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalStorageDriver, SupabaseStorageDriver } from "./storage.service";

/** A minimal stand-in for Supabase Storage's object API, recording what it's sent. */
function fakeSupabase() {
  const objects = new Map<string, { body: Buffer; contentType: string }>();
  const requests: { method: string; url: string; headers: IncomingMessage["headers"]; body: Buffer }[] = [];
  const server: Server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = Buffer.concat(chunks);
    requests.push({ method: req.method!, url: req.url!, headers: req.headers, body });
    if (req.headers.authorization !== "Bearer service-key" || req.headers.apikey !== "service-key") {
      res.writeHead(401).end();
      return;
    }
    const prefix = "/storage/v1/object/docs";
    if (req.method === "POST" && req.url!.startsWith(`${prefix}/`)) {
      objects.set(decodeURIComponent(req.url!.slice(prefix.length + 1)), { body, contentType: req.headers["content-type"]! });
      res.writeHead(200, { "content-type": "application/json" }).end('{"Key":"ok"}');
    } else if (req.method === "GET" && req.url!.startsWith(`${prefix}/`)) {
      const object = objects.get(decodeURIComponent(req.url!.slice(prefix.length + 1)));
      if (!object) res.writeHead(400).end('{"statusCode":"404","error":"not_found"}');
      else res.writeHead(200, { "content-type": object.contentType }).end(object.body);
    } else if (req.method === "DELETE" && req.url === prefix) {
      for (const key of JSON.parse(body.toString()).prefixes) objects.delete(key);
      res.writeHead(200).end("[]");
    } else {
      res.writeHead(404).end();
    }
  });
  return { server, objects, requests };
}

describe("SupabaseStorageDriver", () => {
  const fake = fakeSupabase();
  let driver: SupabaseStorageDriver;

  beforeAll(async () => {
    await new Promise<void>((resolve) => fake.server.listen(0, resolve));
    const { port } = fake.server.address() as { port: number };
    driver = new SupabaseStorageDriver(`http://127.0.0.1:${port}/`, "service-key", "docs");
  });
  afterAll(() => new Promise((resolve) => fake.server.close(resolve)));

  it("uploads, downloads and deletes with the service key", async () => {
    const key = "products/AA-SBC-05/123-coa file.pdf";
    await driver.put(key, Buffer.from("%PDF-1.7"), "application/pdf");
    const upload = fake.requests.at(-1)!;
    expect(upload.url).toBe("/storage/v1/object/docs/products/AA-SBC-05/123-coa%20file.pdf");
    expect(upload.headers["x-upsert"]).toBe("false");

    const object = await driver.get(key);
    expect(object?.body.toString()).toBe("%PDF-1.7");
    expect(object?.contentType).toBe("application/pdf");

    await driver.remove(key);
    expect(fake.objects.size).toBe(0);
    expect(await driver.get(key)).toBeNull();
  });

  it("surfaces storage errors instead of pretending to succeed", async () => {
    const { port } = fake.server.address() as { port: number };
    const wrongKey = new SupabaseStorageDriver(`http://127.0.0.1:${port}`, "wrong", "docs");
    await expect(wrongKey.put("x.pdf", Buffer.from("%PDF-"), "application/pdf")).rejects.toThrow(/401/);
  });
});

describe("LocalStorageDriver", () => {
  it("round-trips files and refuses keys outside its root", async () => {
    const root = await mkdtemp(join(tmpdir(), "aa-storage-"));
    const driver = new LocalStorageDriver(root);
    await driver.put("orders/o1/a.pdf", Buffer.from("%PDF-"), "application/pdf");
    expect((await driver.get("orders/o1/a.pdf"))?.contentType).toBe("application/pdf");
    await driver.remove("orders/o1/a.pdf");
    expect(await driver.get("orders/o1/a.pdf")).toBeNull();
    await expect(driver.put("../escape.pdf", Buffer.from("x"), "application/pdf")).rejects.toThrow(/Invalid storage key/);
    await rm(root, { recursive: true, force: true });
  });
});
