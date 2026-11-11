import { cpSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite'

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [
		preact(),
		tailwindcss(),
		{
			name: 'private-books',
			apply: 'build',
			closeBundle() {
				cpSync(
					path.join(projectRoot, 'books'),
					path.join(projectRoot, 'dist', '_private', 'books'),
					{ recursive: true },
				);
			},
		},
	]
});
