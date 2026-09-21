import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';

import { build, context, Plugin } from 'esbuild';

const minify = true;

const embedCss = ({ tmpDir, minify }: { tmpDir: string, minify: boolean }): Plugin => {
  const cache = new Map();
  return {
    name: "embed-css",
    setup(esb) {
      esb.onLoad({ filter: /.*\.css$/ }, async args => {
        const st = await fs.promises.stat(args.path);
        if (!cache.has(args.path) || cache.get(args.path).mtimeMs != st.mtimeMs) {
          const outfile = path.join(tmpDir, crypto.createHash('sha1').update(args.path).digest('hex'));
          await build({
            entryPoints: [args.path],
            outfile,
            bundle: true,
            minify,
            loader: {
              '.svg': 'dataurl',
              '.css': 'css',
            },
          });
          cache.set(args.path, {
            mtime: st.mtimeMs,
            output: await fs.promises.readFile(outfile, 'utf8')
          });
        }
        const text = cache.get(args.path).output;
        return {
          contents: text,
          loader: 'text',
        }
      })
    }
  };
}
const htmlMinify = ({ minify }: { minify: boolean }): Plugin => {
  return {
    name: "html-minify",
    setup(esb) {
      esb.onLoad({ filter: /.*\.html$/ }, async args => {
        let text = await fs.promises.readFile(args.path, 'utf8');
        if (minify) text = text.replace(/[\s\n]+/g, ' ').replace(/>\s</g, '><');
        return {
          contents: text,
          loader: 'text',
        }
      });
    }
  };
}

async function main(tmpDir: string) {
  const options = {
    entryPoints: [path.resolve(__dirname, 'src/index.ts')],
    outfile: 'dist/index.mjs',
    bundle: true,
    format: "esm",
    loader: {
      '.html': 'text',
    },
    minify,
    plugins: [
      embedCss({ minify, tmpDir }),
      htmlMinify({ minify }),
    ]
  } as const;
  if (process.env.WATCH === "1") {
    const ctx = await context(options);
    await ctx.watch();
  } else {
    await build(options);
  }
}
const withTmpDir = async (f: (tmpDir: string) => Promise<void>) => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "esbuild"))
  try {
    f(tmpDir)
  } finally {
    fs.promises.rm(tmpDir, { recursive: true });
  }
}
withTmpDir((tmpDir) => main(tmpDir))
