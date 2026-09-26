/**
 * Grants a platform role to an existing user:
 *
 *   pnpm db:set-role someone@besbpo.co.za STAFF     # review trade applications and quotes
 *   pnpm db:set-role someone@besbpo.co.za ADMIN
 *   pnpm db:set-role someone@besbpo.co.za CUSTOMER  # revoke
 *
 * On Render, run it from the aggregates-store-api service's Shell tab. Roles
 * are never granted through the website, so an account can't promote itself.
 */
import { PrismaClient, UserRole } from "@prisma/client";

async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email || !role || !(role in UserRole)) {
    console.error(`Usage: pnpm db:set-role <email> <${Object.keys(UserRole).join("|")}>`);
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.update({ where: { email: email.toLowerCase() }, data: { role: role as UserRole } });
    console.log(`${user.email} is now ${user.role}.`);
  } catch {
    console.error(`No user registered with ${email} — they need to create an account first.`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
