import esbuild from "esbuild";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const prod = process.argv.includes("--production");
const dev = process.argv.includes("--dev");

const outdir = resolve(import.meta.dirname, "dist");
mkdirSync(outdir, { recursive: true });

const ctx = await esbuild.context({
  entryPoints: [resolve(import.meta.dirname, "src/main.ts")],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/state", "@codemirror/view"],
  format: "cjs",
  target: "es2022",
  sourcemap: prod ? false : "inline",
  outfile: resolve(outdir, "main.js"),
  logLevel: "info",
});

copyFileSync(
  resolve(import.meta.dirname, "manifest.json"),
  resolve(outdir, "manifest.json"),
);

if (!prod) {
  writeFileSync(resolve(outdir, ".hotreload"), "");
}

if (dev) {
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
