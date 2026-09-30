/**
 * Checks DATABASE_URL and DIRECT_URL before migrations run, and explains a
 * broken value in plain words. Passwords are never printed.
 *
 * Runs first in `db:deploy` (Render's pre-deploy step). Exits 1 on a problem
 * that would stop the API from reaching the database; prints warnings only
 * for things that merely look unusual. See docs/deployment/render.md §1.
 */
const onRender = Boolean(process.env.RENDER);
const errors = [];
const warnings = [];

function check(name, { runtime }) {
  const raw = process.env[name];
  if (!raw || !raw.trim()) {
    errors.push(`${name} is not set. Paste the Supabase ${runtime ? "Transaction pooler" : "Session pooler"} URI into the API service's Environment.`);
    return null;
  }
  const value = raw.trim();
  if (value !== raw) warnings.push(`${name} has spaces or a line break at the start or end — remove them.`);
  if (/\[YOUR-PASSWORD\]/i.test(value)) {
    errors.push(`${name} still contains the placeholder [YOUR-PASSWORD]. Replace it with your database password.`);
    return null;
  }
  if (!/^postgres(ql)?:\/\//.test(value)) {
    errors.push(`${name} must start with postgresql:// (it starts with "${value.slice(0, 12)}…").`);
    return null;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    errors.push(`${name} isn't a valid URL. The usual cause is a password containing @ # / ? % or spaces — reset the database password to letters and numbers only (see render.md).`);
    return null;
  }

  const host = url.hostname;
  const port = url.port || "5432";
  const masked = `${url.protocol}//${decodeURIComponent(url.username)}:****@${host}:${port}${url.pathname}`;
  console.log(`${name}: ${masked}`);

  const looksLikeHost = host === "localhost" || /^[0-9.]+$/.test(host) || (/^[a-z0-9.-]+$/i.test(host) && host.includes("."));
  if (!looksLikeHost) {
    errors.push(
      `${name} points at the server "${host}", which isn't a real host name. This happens when the password contains @ together with # / or ? — ` +
        `everything after the @ is read as the server. Reset the Supabase database password to letters and numbers only, then paste both URIs again.`,
    );
    return url;
  }
  if (/^db\.[a-z0-9]+\.supabase\.co$/i.test(host)) {
    const message = `${name} uses Supabase's Direct connection (${host}), which is IPv6-only. Render can't reach it — use the Session pooler URI (…pooler.supabase.com).`;
    (onRender ? errors : warnings).push(message);
  }
  if (host.endsWith("pooler.supabase.com")) {
    if (!/^postgres\.[a-z0-9]+$/i.test(decodeURIComponent(url.username))) {
      warnings.push(`${name}: Supabase pooler users look like postgres.<project-ref>; this one is "${decodeURIComponent(url.username)}".`);
    }
    if (runtime && port === "5432") warnings.push(`${name} uses port 5432 (session pooler). The Transaction pooler (port 6543) suits the API better.`);
    if (!runtime && port === "6543") errors.push(`${name} uses port 6543 (transaction pooler); migrations need the Session pooler on port 5432.`);
  }
  if (runtime && port === "6543" && url.searchParams.get("pgbouncer") !== "true") {
    errors.push(`${name} uses the transaction pooler (port 6543) but doesn't end with ?pgbouncer=true&connection_limit=1.`);
  }
  if (!url.password) warnings.push(`${name} has no password.`);
  return url;
}

check("DATABASE_URL", { runtime: true });
check("DIRECT_URL", { runtime: false });

for (const warning of warnings) console.warn(`warning: ${warning}`);
if (errors.length > 0) {
  for (const error of errors) console.error(`error: ${error}`);
  console.error("Database connection settings need fixing before the API can deploy (docs/deployment/render.md, step 1).");
  process.exit(1);
}
console.log("Database connection settings look right.");
