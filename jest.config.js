import { jsWithBabel as tsjPreset } from "ts-jest/presets";
import babelConfig from "./.babel.config.js";

export default {
	preset: "ts-jest/presets/js-with-ts",
	testEnvironment: "node",
	globals: {
		"ts-jest": {
			packageJson: "package.json",
			tsConfig: "tsconfig.jest.json",
			babelConfig: babelConfig,
		},
	},
	setupFiles: ["./jest.env.js"],
	transform: {
		...tsjPreset.transform,
	},
	moduleDirectories: ["node_modules"],
	testMatch: null,
	testRegex: "(/(tests|src|lib)/.*(.(test|spec)).(j|t)sx?)$",
	testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.yarn/", "<rootDir>/.cache/", "<rootDir>/dist/"],
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
	collectCoverage: true,
	coverageReporters: ["text"],
	maxConcurrency: 10,
	cacheDirectory: ".cache/jest",
	roots: ["<rootDir>/src/", "<rootDir>/tests/"],
};
