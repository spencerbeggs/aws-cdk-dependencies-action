// eslint-disable-next-line @typescript-eslint/no-var-requires, no-undef
require("dotenv").config();
// eslint-disable-next-line no-undef
module.exports = {
	client: {
		service: {
			name: "github",
			includes: ["src/**", "vendor/**"],
			localSchemaFile: "node_modules/@octokit/graphql-schema/schema.graphql",
			// url: "https://api.github.com/graphql",
			// headers: {
			// 	// eslint-disable-next-line no-undef
			// 	Authorization: `bearer ${process.env.GITHUB_TOKEN}`,
			// },
			tsFileExtension: "d.ts",
		},
	},
};
