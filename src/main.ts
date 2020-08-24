import { CdkReleaseAssets, CdkReleaseAssetsQuery, CdkReleaseAssetsQueryVariables, ReleaseAsset } from "./generated/graphql";
import { ParsedUrlQuery, parse as parseQuery } from "querystring";
import { clean, gt, intersects, minVersion } from "semver";
import { createWriteStream, promises } from "fs";
import { ensureDir, pathExists } from "fs-extra";
import { getInput, setFailed, setOutput } from "@actions/core";

import { HttpClient } from "typed-rest-client/HttpClient";
import JSZip from "jszip";
import { client } from "./client";
import { env } from "process";
import { extract } from "tar-stream";
import gunzip from "gunzip-maybe";
import { inspect } from "util";
import { join } from "path";
import { parseURL } from "whatwg-url";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function log(obj: any) {
	console.log(inspect(obj, false, 7, true));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debug(obj: any): void {
	if (env.APP_ENV === "debug") {
		if (Array.isArray(obj)) {
			obj.forEach((item) => log(item));
		} else if (obj !== null && typeof obj === "object") {
			log(obj);
		} else if (typeof obj === "string") {
			console.log(obj);
		}
	}
}

async function getReleaseDownloadUrl(tagName: string): Promise<string> {
	const version = clean(tagName);
	const result = await client.query<CdkReleaseAssetsQuery, CdkReleaseAssetsQueryVariables>({
		query: CdkReleaseAssets,
		variables: {
			tagName,
		},
	});
	const assets = result.data.repository.release.releaseAssets.edges.map((edge) => edge.node as ReleaseAsset);
	return assets.reduce((acc: string, asset): string => {
		if (asset.name === `aws-cdk-${version}.zip`) {
			acc = asset.url;
		}
		return acc;
	}, null);
}

interface AssetQuery extends ParsedUrlQuery {
	"X-Amz-Algorithm": string;
	"X-Amz-Credential": string;
	"X-Amz-Date": string;
	"X-Amz-Expires": string;
	"X-Amz-Signature": string;
	"X-Amz-SignedHeaders": string;
	actor_id: string;
	repo_id: string;
	"response-content-disposition": string;
	"response-content-type": string;
}

function getFilename(url: string): string {
	const { query } = parseURL(url);
	const { "response-content-disposition": param } = parseQuery(query) as AssetQuery;
	if (!param) {
		throw new Error("response-content-disposition query string not found");
	}
	return param.split("filename=").pop();
}

async function download(url) {
	const filename = getFilename(url);
	const dirPath = join(process.cwd(), "tmp");
	const filePath = join(process.cwd(), `tmp/${filename}`);
	await ensureDir(dirPath);
	if (await pathExists(filePath)) {
		return filePath;
	}
	return new Promise<string>(async (resolve) => {
		const client = new HttpClient("download");
		const stream: NodeJS.WritableStream = createWriteStream(filePath);
		(await client.get(url)).message.pipe(stream).on("close", () => {
			stream.end();
			resolve(filePath);
		});
	});
}

type PackageJson = Record<string, unknown>;

async function getPackages(filePath: string) {
	const data = await promises.readFile(filePath);
	const zip = await JSZip.loadAsync(data);
	return Promise.all(
		zip
			.folder("js")
			.filter((relativePath) => {
				return relativePath.endsWith(".tgz");
			})
			.map((file) => {
				return new Promise<PackageJson[]>((resolve) => {
					const pkgs: PackageJson[] = [];
					file
						.nodeStream()
						.pipe(gunzip())
						.pipe(extract())
						.on("entry", function (header, stream, next) {
							stream.on("end", function () {
								next(); // ready for next entry
							});
							if (header.name === "package/package.json") {
								const data = [];
								stream
									.on("data", (chunk) => data.push(chunk))
									.on("finish", function () {
										const json = Buffer.concat(data).toString();
										try {
											const pkg = JSON.parse(json);
											pkgs.push(pkg);
										} catch (err) {
											console.log(err);
										}
									})
									.on("error", (err) => {
										console.log(err);
									});
							}
							stream.resume();
						})
						.on("finish", () => resolve(pkgs));
				});
			}),
	).then((arr) => {
		return Promise.resolve([].concat([], ...arr).filter((item) => Boolean(item)));
	});
}

function normalizeVersions(pkg: string, v1: string, v2: string): string {
	if (!intersects(v1, v2)) {
		debug(`${pkg}@${v1} and ${pkg}@${v2} do not intersect`);
	}
	const { version: v1Min } = minVersion(v1);
	const { version: v2Min } = minVersion(v2);
	return gt(v1Min, v2Min) ? v1 : v2;
}

export async function main(): Promise<void> {
	try {
		const tagName = env.RELEASE ?? getInput("release");
		const url = await getReleaseDownloadUrl(tagName);
		const source = await download(url);
		const packages = await getPackages(source);
		const { stable, experimental, deprecated, unknown } = Object.values(packages).reduce(
			(acc, pkg) => {
				switch (pkg.stability) {
					case "stable":
						acc.stable.push(pkg);
						break;
					case "experimental":
						acc.experimental.push(pkg);
						break;
					case "deprecated":
						acc.deprecated.push(pkg);
						break;
					default:
						acc.unknown.push(pkg);
						break;
				}
				return acc;
			},
			{ stable: [], experimental: [], deprecated: [], unknown: [] },
		);
		debug(`stable packages: ${stable.length}`);
		debug(`experimental packages: ${experimental.length}`);
		debug(`deprecated packages: ${deprecated.length}`);
		debug(`unknown packages: ${unknown.length}`);
		const output = [stable, experimental].flat().reduce((acc, { name, version, peerDependencies = {} }) => {
			const current = acc[name];
			if (current && current !== version) {
				version = normalizeVersions(name, current, version);
			}
			acc[name] = version;
			Object.entries(peerDependencies).forEach(([peerName, peerVersion]) => {
				const currentPeer = acc[peerName];
				if (currentPeer && currentPeer !== peerVersion) {
					peerVersion = normalizeVersions(name, currentPeer, peerVersion as string);
				}
				acc[peerName] = peerVersion;
			});
			acc = Object.fromEntries(Object.entries(acc).sort());
			return acc;
		}, {});
		if (env.APP_ENV === "debug") {
			debug(output);
			process.exit(0);
		} else {
			setOutput("dependencies", JSON.stringify(output));
		}
	} catch (err) {
		console.log(err);
		setFailed(`Action failed with error ${err}`);
	}
}
