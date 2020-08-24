import "cross-fetch/polyfill";

import { InMemoryCache, NormalizedCacheObject } from "apollo-cache-inmemory";

import { ApolloClient } from "apollo-client";
import { HttpLink } from "apollo-link-http";
import { env } from "process";
import { getInput } from "@actions/core";

function makeClient(): ApolloClient<NormalizedCacheObject> {
	const token = env.GITHUB_TOKEN ?? getInput("token", { required: true });

	if (!token) {
		throw new Error(
			"You need to provide a Github personal access token as `GITHUB_TOKEN` env variable. See README for more info.",
		);
	}

	return new ApolloClient({
		link: new HttpLink({
			uri: "https://api.github.com/graphql",
			headers: {
				authorization: `token ${token}`,
			},
		}),
		cache: new InMemoryCache(),
	});
}

export const client = makeClient();
