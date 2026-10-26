const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");

const root = path.resolve(__dirname, "../..");
const desktop = path.resolve(__dirname, "..");
const renderer = path.join(desktop, "renderer");
const configPath = path.join(root, "config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

if (typeof config.supabaseUrl !== "string" ||
    !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.supabaseUrl) ||
    typeof config.supabasePublishableKey !== "string" ||
    !config.supabasePublishableKey.startsWith("sb_publishable_")) {
  throw new Error("Expected a Supabase URL and publishable client key in root config.json");
}

const safeConfig = {
  supabaseUrl: config.supabaseUrl,
  supabasePublishableKey: config.supabasePublishableKey
};
fs.writeFileSync(
  path.join(renderer, "config.generated.js"),
  "window.LORGUS_CONFIG = Object.freeze(" + JSON.stringify(safeConfig) + ");\n",
  "utf8"
);

esbuild.buildSync({
  entryPoints: [path.join(renderer, "app.js")],
  outfile: path.join(renderer, "app.bundle.js"),
  bundle: true,
  platform: "browser",
  format: "iife",
  target: ["chrome120"],
  minify: true,
  sourcemap: false,
  legalComments: "none"
});
console.log("Renderer bundled locally; only the public Supabase configuration is included.");
