import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export type StoredObject = { body: Buffer; contentType: string };

interface StorageDriver {
  readonly name: string;
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  remove(key: string): Promise<void>;
}

/**
 * Supabase Storage over its REST API, with the service-role key (server
 * side only). The bucket is private: files are only ever served through the
 * API, which applies the document's visibility rules.
 */
export class SupabaseStorageDriver implements StorageDriver {
  readonly name = "supabase";

  constructor(
    private readonly baseUrl: string,
    private readonly serviceKey: string,
    private readonly bucket: string,
  ) {}

  private objectUrl(key: string) {
    const path = key.split("/").map(encodeURIComponent).join("/");
    return `${this.baseUrl.replace(/\/+$/, "")}/storage/v1/object/${encodeURIComponent(this.bucket)}/${path}`;
  }

  private headers(extra: Record<string, string> = {}) {
    return { Authorization: `Bearer ${this.serviceKey}`, apikey: this.serviceKey, ...extra };
  }

  async put(key: string, body: Buffer, contentType: string) {
    const response = await fetch(this.objectUrl(key), {
      method: "POST",
      headers: this.headers({ "Content-Type": contentType, "x-upsert": "false" }),
      body: new Uint8Array(body),
    });
    if (!response.ok) {
      throw new Error(`Supabase Storage upload failed: ${response.status} ${await response.text()}`);
    }
  }

  async get(key: string): Promise<StoredObject | null> {
    const response = await fetch(this.objectUrl(key), { headers: this.headers() });
    if (response.status === 400 || response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Supabase Storage download failed: ${response.status} ${await response.text()}`);
    }
    return {
      body: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get("content-type") ?? "application/octet-stream",
    };
  }

  async remove(key: string) {
    const response = await fetch(`${this.baseUrl.replace(/\/+$/, "")}/storage/v1/object/${encodeURIComponent(this.bucket)}`, {
      method: "DELETE",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ prefixes: [key] }),
    });
    if (!response.ok) {
      throw new Error(`Supabase Storage delete failed: ${response.status} ${await response.text()}`);
    }
  }
}

/** Local-disk driver for development and tests. Never used on Render, whose disk is ephemeral. */
export class LocalStorageDriver implements StorageDriver {
  readonly name = "local";

  constructor(private readonly root: string) {}

  private path(key: string) {
    const target = resolve(this.root, key);
    if (!target.startsWith(resolve(this.root) + "/")) throw new Error("Invalid storage key.");
    return target;
  }

  async put(key: string, body: Buffer, contentType: string) {
    const target = this.path(key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, body);
    await writeFile(`${target}.content-type`, contentType);
  }

  async get(key: string): Promise<StoredObject | null> {
    const target = this.path(key);
    try {
      const [body, contentType] = await Promise.all([readFile(target), readFile(`${target}.content-type`, "utf8")]);
      return { body, contentType };
    } catch {
      return null;
    }
  }

  async remove(key: string) {
    const target = this.path(key);
    await rm(target, { force: true });
    await rm(`${target}.content-type`, { force: true });
  }
}

function driverFromEnv(): StorageDriver | null {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STORAGE_BUCKET, STORAGE_LOCAL_DIR, RENDER } = process.env;
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    return new SupabaseStorageDriver(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STORAGE_BUCKET || "compliance-documents");
  }
  if (RENDER) return null; // a deployment must use real object storage
  return new LocalStorageDriver(STORAGE_LOCAL_DIR || join(process.cwd(), ".storage"));
}

/** Object storage for uploaded files (compliance documents). */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: StorageDriver | null;

  constructor() {
    this.driver = driverFromEnv();
    this.logger.log(
      this.driver ? `Document storage: ${this.driver.name}` : "Document storage not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  get configured() {
    return this.driver !== null;
  }

  private require(): StorageDriver {
    if (!this.driver) {
      throw new ServiceUnavailableException("Document storage isn't configured yet — see docs/deployment/render.md.");
    }
    return this.driver;
  }

  put(key: string, body: Buffer, contentType: string) {
    return this.require().put(key, body, contentType);
  }

  get(key: string) {
    return this.require().get(key);
  }

  remove(key: string) {
    return this.require().remove(key);
  }
}
