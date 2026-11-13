#!/usr/bin/env node
/**
 * Supabase CI Verification Gate
 *
 * Validates:
 * 1. `supabase/migrations/*.sql` follow `YYYYMMDDHHMMSS_name.sql`, have unique timestamps, and are non-empty.
 * 2. `supabase/functions/deployed.json` is valid JSON tracking function manifest records.
 * 3. All `.ts` files under `supabase/functions/` parse & transpile without TypeScript errors.
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const require = createRequire(import.meta.url);
const tsPath = path.resolve(REPO_ROOT, "frontend/node_modules/typescript/lib/typescript.js");
if (!fs.existsSync(tsPath)) {
  console.error(`Error: Could not find TypeScript compiler at ${tsPath}. Run pnpm install in frontend/ first.`);
  process.exit(1);
}
const ts = require(tsPath);

function collectTsFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      results.push(fullPath);
    }
  }
  return results.sort();
}

function validateMigrations() {
  const migrationsDir = path.join(REPO_ROOT, "supabase/migrations");
  if (!fs.existsSync(migrationsDir)) {
    throw new Error("supabase/migrations directory not found.");
  }

  const sqlFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const seenVersions = new Map();
  for (const file of sqlFiles) {
    const match = file.match(/^(\d{14})_[a-z0-9_]+\.sql$/);
    if (!match) {
      throw new Error(`Invalid migration filename (expected YYYYMMDDHHMMSS_snake_case.sql): ${file}`);
    }
    const version = match[1];
    if (seenVersions.has(version)) {
      throw new Error(`Duplicate migration timestamp '${version}': ${seenVersions.get(version)} and ${file}`);
    }
    seenVersions.set(version, file);

    const content = fs.readFileSync(path.join(migrationsDir, file), "utf8").trim();
    if (!content) {
      throw new Error(`Migration file is empty: ${file}`);
    }
  }
  console.log(`Validated ${sqlFiles.length} SQL migration files (unique timestamps, non-empty).`);
}

function validateDeployedManifest() {
  const manifestPath = path.join(REPO_ROOT, "supabase/functions/deployed.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error("supabase/functions/deployed.json not found.");
  }
  const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("supabase/functions/deployed.json must be a JSON object.");
  }
  console.log(`Validated Edge Functions manifest (${Object.keys(parsed).length} project namespace(s)).`);
}

function validateEdgeFunctionsTypeScript() {
  const functionsDir = path.join(REPO_ROOT, "supabase/functions");
  const tsFiles = collectTsFiles(functionsDir);
  let failures = 0;

  for (const absPath of tsFiles) {
    const relPath = path.relative(REPO_ROOT, absPath);
    const source = fs.readFileSync(absPath, "utf8");
    const result = ts.transpileModule(source, {
      fileName: relPath,
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        strict: true,
      },
    });
    const errors = (result.diagnostics || []).filter(
      (d) => d.category === ts.DiagnosticCategory.Error,
    );
    if (errors.length > 0) {
      failures++;
      for (const diag of errors) {
        const msg = ts.flattenDiagnosticMessageText(diag.messageText, "\n");
        console.error(`TS syntax error in ${relPath}: ${msg}`);
      }
    }
  }

  if (failures > 0) {
    throw new Error(`Edge Functions TypeScript check failed in ${failures} file(s).`);
  }
  console.log(`Validated ${tsFiles.length} Supabase Edge Function TypeScript files.`);
}

try {
  validateMigrations();
  validateDeployedManifest();
  validateEdgeFunctionsTypeScript();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
