import babel from "@rollup/plugin-babel";
import builtins from "builtin-modules";
import commonjs from "@rollup/plugin-commonjs";
import { join } from "path";
import json from "@rollup/plugin-json";
import license from "rollup-plugin-license";
import pkg from "./package.json";
import replace from "@rollup/plugin-replace";
import resolve from "@rollup/plugin-node-resolve";
import { terser } from "rollup-plugin-terser";
import typescript from "@rollup/plugin-typescript";

const { NODE_ENV = "development" } = process.env;
const isProduction = NODE_ENV === "production";
const extensions = [".js", ".jsx", ".ts", ".tsx"];

export default {
	input: pkg.main,
	output: [{ dir: "./dist", format: "cjs", sourcemap: true }],
	external: [...builtins, ...Object.keys(!isProduction ? pkg.dependencies || {} : {})],
	watch: {
		include: "src/**",
	},
	plugins: [
		isProduction &&
			license({
				sourcemap: true,
				banner: {
					commentStyle: "regular", // The default
					content: {
						file: join(__dirname, "LICENSE"),
						encoding: "utf-8", // Default is utf-8
					},
				},
				thirdParty: {
					includePrivate: true, // Default is false.
					output: {
						file: join(__dirname, "dist", "dependencies.txt"),
						encoding: "utf-8", // Default is utf-8.
					},
				},
			}),
		replace({
			"process.env.NODE_ENV": JSON.stringify(NODE_ENV),
		}),
		json(),
		typescript({
			sourceMap: true,
		}),
		babel({ extensions, include: ["src/**/*"], babelHelpers: "bundled" }),
		resolve({
			rootDir: join(process.cwd(), ".."),
			preferBuiltins: true,
		}),
		commonjs({
			dynamicRequireTargets: ["node_modules/encoding/lib/*.js"],
		}),
		isProduction && terser(),
	],
};
