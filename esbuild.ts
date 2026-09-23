import path from "node:path";
import { build, context } from "esbuild";
import type { BuildOptions, Plugin } from "esbuild";

const minify = true;

const embedCss: Plugin = {
  name: "embed-css",
  setup(esb) {
    esb.onLoad({ filter: /\.css$/ }, async (args) => {
      const result = await build({
        entryPoints: [args.path],
        bundle: true,
        minify,
        write: false,
        metafile: true,
        loader: { ".svg": "dataurl" },
      });
      return {
        contents: result.outputFiles[0].text,
        loader: "text",
        // Track CSS imports and images in the outer build's watch mode too.
        watchFiles: Object.keys(result.metafile.inputs).map((input) =>
          path.resolve(input),
        ),
      };
    });
  },
};

async function main() {
  const options: BuildOptions = {
    entryPoints: [path.resolve(__dirname, "src/index.ts")],
    outfile: "dist/index.mjs",
    bundle: true,
    format: "esm",
    loader: { ".html": "text" },
    minify,
    plugins: [embedCss],
  };
  if (process.env.WATCH === "1") {
    const ctx = await context(options);
    await ctx.watch();
  } else {
    await build(options);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
