export default {
	presets: [
		["@babel/preset-typescript", { "allowNamespaces": true }],
		[
			"@babel/preset-env", {
				"targets": ["defaults"]
			}
		]
	],
	plugins: [
		"macros",
		"@babel/proposal-class-properties",
		"lodash"
	],
	comments: false,
};
