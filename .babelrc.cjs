module.exports = {
	"presets": [
		["@babel/preset-typescript", { "allowNamespaces": true }],
		[
			"@babel/preset-env",
			{
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
		"lodash"
	],
	"comments": true,
	"sourceType": "unambiguous"
};
