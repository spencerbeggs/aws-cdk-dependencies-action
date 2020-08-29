import { getInput } from "@actions/core";
import { ApolloClient, createHttpLink, InMemoryCache, NormalizedCacheObject } from "@apollo/client/core";
import fetch from "cross-fetch";

const token = process.env.GITHUB_TOKEN ?? getInput("token", { required: true });

if (!token) {
	throw new Error(
		"You need to provide a Github personal access token as `GITHUB_TOKEN` env variable. See README for more info.",
	);
}

const link = createHttpLink({
	uri: "https://api.github.com/graphql",
	headers: {
		authorization: `token ${token}`,
	},
	fetch,
});

export const client: ApolloClient<NormalizedCacheObject> = new ApolloClient({
	link,
	cache: new InMemoryCache(),
});
