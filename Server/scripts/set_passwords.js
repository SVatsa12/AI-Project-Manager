// Server/scripts/set_passwords.js
// Usage:
//  node scripts/set_passwords.js --email alice@example.com --password "password"
//  node scripts/set_passwords.js --all --password "password"   // set for all missing or plaintext
//
// This script will create a backup users.json.bak.TIMESTAMP before modifying.

const fs = require("fs");
const path = require("path");

// Prefer native bcrypt; fallback to bcryptjs if native fails to build
let bcrypt;
try {
  bcrypt = require("bcrypt");
} catch (e) {
  bcrypt = require("bcryptjs");
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--email") out.email = args[++i];
    else if (a === "--password") out.password = args[++i];
    else if (a === "--all") out.all = true;
    else if (a === "--dry") out.dry = true;
    else if (a === "--help") out.help = true;
  }
  return out;
}

async function main() {
  const { email, password = "password", all, dry, help } = parseArgs();
  if (help) {
    console.log("Usage:");
    console.log("  node scripts/set_passwords.js --email alice@example.com --password \"password\"");
    console.log("  node scripts/set_passwords.js --all --password \"password\"   // set for all missing or plaintext");
    process.exit(0);
  }

  const USERS_PATH = path.join(__dirname, "..", "data", "users.json");
  if (!fs.existsSync(USERS_PATH)) {
    console.error("users.json not found at", USERS_PATH);
    process.exit(1);
  }

  const raw = fs.readFileSync(USERS_PATH, "utf8");
  let users;
  try {
    users = JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse users.json:", e);
    process.exit(1);
  }

  // Backup
  const bakPath = USERS_PATH + ".bak." + Date.now();
  fs.writeFileSync(bakPath, raw, "utf8");
  console.log("Backup written to", bakPath);

  let updated = 0;
  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const uEmail = (u.email || "").toLowerCase();
    const hasPw = typeof u.password === "string" && u.password.length > 0;

    const shouldUpdate =
      all
        ? true // update all (re-hash plaintext too)
        : email
          ? (email.toLowerCase() === uEmail)
          : false;

    // only change when shouldUpdate and either no password or password looks plaintext (not starting with $2)
    if (shouldUpdate) {
      const stored = u.password || "";
      const looksHashed = typeof stored === "string" && stored.startsWith("$2");
      if (!looksHashed || all) {
        if (dry) {
          console.log("[dry] Would hash for:", uEmail, "was:", stored ? stored.slice(0, 20) + "..." : "<none>");
        } else {
          const hash = await bcrypt.hash(password, 10);
          users[i].password = hash;
          updated++;
          console.log("Set hashed password for", uEmail);
        }
      } else {
        console.log("Skipping already-hashed user", uEmail);
      }
    } else {
      // if --all and user has plaintext, we still re-hash; already covered
    }
  }

  if (dry) {
    console.log("Dry run - no file changes made.");
    process.exit(0);
  }

  if (updated > 0) {
    fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), "utf8");
    console.log("Wrote", updated, "updated users to", USERS_PATH);
  } else {
    console.log("No users updated.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
