import nodeResolve from '@rollup/plugin-node-resolve';
import webextManifest from 'rollup-plugin-webext-manifest';

export default {
	input: 'src/manifest.json',
	plugins: [
		webextManifest({
			targetPlatform: process.env.TARGET_PLATFORM,
			indent: 2,
		}),
		// Pull polyfills from node_modules
		nodeResolve(),
	],
	output: {
		dir: 'build',
		assetFileNames: '[name].[ext]',
		// sourcemap: true,
	},
	onwarn (warning, warn) {
		// Suppress warnings from dependencies (Rollup complains about
		// webextension-polyfill using top-level `this` even though it's fine)
		if (warning.code === 'THIS_IS_UNDEFINED') {
			return;
		}
		// log other warnings to console
		warn(warning);
	},
};
