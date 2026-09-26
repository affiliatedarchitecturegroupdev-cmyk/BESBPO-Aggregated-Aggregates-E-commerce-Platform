// Plain CommonJS entry so the compiled API can load this package on any Node
// version without TypeScript support. Types come from index.d.ts.
module.exports = require("@prisma/client");
