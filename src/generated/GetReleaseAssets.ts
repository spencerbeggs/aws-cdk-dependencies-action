/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL query operation: GetReleaseAssets
// ====================================================

export interface GetReleaseAssets_repository_release_releaseAssets_edges_node {
  __typename: "ReleaseAsset";
  id: string;
  /**
   * Identifies the title of the release asset.
   */
  name: string;
  /**
   * Identifies the URL of the release asset.
   */
  url: any;
}

export interface GetReleaseAssets_repository_release_releaseAssets_edges {
  __typename: "ReleaseAssetEdge";
  /**
   * The item at the end of the edge.
   */
  node: GetReleaseAssets_repository_release_releaseAssets_edges_node | null;
}

export interface GetReleaseAssets_repository_release_releaseAssets {
  __typename: "ReleaseAssetConnection";
  /**
   * A list of edges.
   */
  edges: (GetReleaseAssets_repository_release_releaseAssets_edges | null)[] | null;
}

export interface GetReleaseAssets_repository_release {
  __typename: "Release";
  /**
   * List of releases assets which are dependent on this release.
   */
  releaseAssets: GetReleaseAssets_repository_release_releaseAssets;
}

export interface GetReleaseAssets_repository {
  __typename: "Repository";
  /**
   * Lookup a single release given various criteria.
   */
  release: GetReleaseAssets_repository_release | null;
}

export interface GetReleaseAssets {
  /**
   * Lookup a given repository by the owner and repository name.
   */
  repository: GetReleaseAssets_repository | null;
}

export interface GetReleaseAssetsVariables {
  tagName: string;
}
