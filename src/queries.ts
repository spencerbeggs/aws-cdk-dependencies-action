import { gql } from "@apollo/client/core";
export const GET_CDK_RELEASE_ASSETS = gql`
	query GetReleaseAssets($tagName: String!) {
		repository(owner: "aws", name: "aws-cdk") {
			release(tagName: $tagName) {
				releaseAssets(first: 100) {
					edges {
						node {
							id
							name
							url
						}
					}
				}
			}
		}
	}
`;
