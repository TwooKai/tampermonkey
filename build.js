#!/usr/bin/env node
import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get input file from command line arguments
const inputFile = process.argv[2];
if (!inputFile) {
  console.error('Usage: npm run build -- path/to/file.js');
  process.exit(1);
}

// Read banner file (for Tampermonkey headers)
const bannerPath = path.join(__dirname, 'src', inputFile);
let banner = '';
if(fs.existsSync(bannerPath))
{
	const UserScript = fs.readFileSync(bannerPath, 'utf8').split('==/UserScript==');
	if(UserScript.length > 1)
		banner = UserScript[0] + '==/UserScript==' + "\n";
}

// Build configuration
esbuild.build({
  entryPoints: [path.join('src', inputFile)],
  bundle: true,
  outfile: path.join('dist', inputFile),
  banner: { js: banner },
  platform: 'browser',
  format: 'iife'
}).catch(() => process.exit(1));