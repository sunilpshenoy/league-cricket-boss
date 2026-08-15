#!/usr/bin/env node
// Extracts the embedded <script> (JSX/Babel) bundle from a League Cricket Boss
// production HTML file and syntax-checks it with `node --check`.
// Usage: node tools/check_syntax.js [file.html ...]
// Defaults to both production files if no arguments are given.

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const DEFAULT_FILES = [
  "LeagueCricketBoss_MP_v1.5.html",
  "LeagueCricketBoss_SP_v2.2.html",
];

const files = process.argv.slice(2);
const targets = (files.length ? files : DEFAULT_FILES).map((f) =>
  path.resolve(process.cwd(), f)
);

const scriptBlockRe =
  /<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>|<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;

let allOk = true;

for (const file of targets) {
  if (!fs.existsSync(file)) {
    console.log(`SKIP  ${path.basename(file)} (not found)`);
    continue;
  }

  const html = fs.readFileSync(file, "utf8");
  let match;
  let biggest = "";
  while ((match = scriptBlockRe.exec(html)) !== null) {
    const block = match[1] || match[2] || "";
    if (block.length > biggest.length) biggest = block;
  }

  if (!biggest) {
    console.log(`SKIP  ${path.basename(file)} (no inline <script> block found)`);
    continue;
  }

  const tmp = path.join(os.tmpdir(), `lcb-syntax-${Date.now()}-${path.basename(file)}.js`);
  fs.writeFileSync(tmp, biggest);

  try {
    execFileSync(process.execPath, ["--check", tmp], { stdio: "pipe" });
    console.log(`OK    ${path.basename(file)}`);
  } catch (err) {
    allOk = false;
    console.log(`FAIL  ${path.basename(file)}`);
    console.log(err.stderr ? err.stderr.toString() : err.message);
  } finally {
    fs.unlinkSync(tmp);
  }
}

process.exit(allOk ? 0 : 1);
