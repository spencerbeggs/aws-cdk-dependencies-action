/* eslint-disable @typescript-eslint/no-var-requires */
const { jsWithBabel: tsjPreset } = require("ts-jest/presets");
const babelConfig = require("./.babelrc.cjs");

module.exports = {
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
