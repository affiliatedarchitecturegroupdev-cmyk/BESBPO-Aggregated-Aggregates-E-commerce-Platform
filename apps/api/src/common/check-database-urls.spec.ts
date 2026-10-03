import { spawnSync } from "node:child_process";
import { join } from "node:path";

const SCRIPT = join(__dirname, "../../../../packages/database/scripts/check-database-urls.js");
const POOLER = "aws-0-eu-central-1.pooler.supabase.com";

function check(env: Record<string, string>) {
  const result = spawnSync(process.execPath, [SCRIPT], { env: { PATH: process.env.PATH ?? "", RENDER: "true", ...env }, encoding: "utf8" });
  return { code: result.status, out: `${result.stdout}${result.stderr}` };
}

describe("pre-deploy database URL check", () => {
  it("passes Supabase's pooler URLs and never prints the password", () => {
    const r = check({
      DATABASE_URL: `postgresql://postgres.abc:S3cretPass@${POOLER}:6543/postgres?pgbouncer=true&connection_limit=1`,
      DIRECT_URL: `postgresql://postgres.abc:S3cretPass@${POOLER}:5432/postgres`,
    });
    expect(r.code).toBe(0);
    expect(r.out).not.toContain("S3cretPass");
    expect(r.out).toContain("****");
  });

  it("explains a password that splits the URL (the 'loop$' host failure)", () => {
    const broken = `postgresql://postgres.abc:My@loop$#9x@${POOLER}:5432/postgres`;
    const r = check({ DATABASE_URL: broken, DIRECT_URL: broken });
    expect(r.code).toBe(1);
    expect(r.out).toContain('"loop$"');
    expect(r.out).toContain("letters and numbers");
    expect(r.out).not.toContain("9x");
  });

  it("refuses the IPv6-only direct host, the placeholder, a missing value and the wrong pooler port", () => {
    expect(check({ DATABASE_URL: `postgresql://postgres.abc:p@${POOLER}:6543/postgres?pgbouncer=true`, DIRECT_URL: "postgresql://postgres:p@db.abc.supabase.co:5432/postgres" }).out).toContain("IPv6-only");
    expect(check({ DATABASE_URL: `postgresql://postgres.abc:[YOUR-PASSWORD]@${POOLER}:6543/postgres`, DIRECT_URL: "" }).code).toBe(1);
    expect(check({ DATABASE_URL: `postgresql://postgres.abc:p@${POOLER}:6543/postgres`, DIRECT_URL: `postgresql://postgres.abc:p@${POOLER}:6543/postgres` }).out).toMatch(/pgbouncer=true[\s\S]*Session pooler on port 5432/);
  });
});
