module.exports = {
	"presets": [
		["@babel/preset-typescript", { "allowNamespaces": true }],
		[
			"@babel/preset-env",
			{
				"modules": process.env.APP_ENV === "jest" ? "commonjs" : false,
				"targets": {
					"node": true
				}
			}
		]
	],
	"plugins": [
		"macros",
		"@babel/proposal-class-properties",
		"@babel/proposal-object-rest-spread",
		"@babel/plugin-proposal-optional-chaining",
		"@babel/plugin-proposal-nullish-coalescing-operator",
		"babel-plugin-lodash"
	],
	"comments": true,
	"sourceType": "unambiguous"
};
