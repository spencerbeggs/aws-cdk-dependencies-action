import { endGroup, info, startGroup, warning } from "@actions/core";
import { createWriteStream, promises } from "fs";
import { ensureDir, pathExists } from "fs-extra";
import gunzip from "gunzip-maybe";
import { loadAsync } from "jszip";
import { orderBy } from "lodash";
import { join } from "path";
import { parse as parseQuery, ParsedUrlQuery } from "querystring";
import { clean, gt, intersects, minVersion } from "semver";
import { extract } from "tar-stream";
import { RestClient } from "typed-rest-client";
import { parseURL } from "whatwg-url";
import { client } from "./client";
import { GetReleaseByTagDocument, GetReleaseByTagQuery } from "./generated";
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

type PackageJson = Record<string, unknown>;

function normalizeVersions(pkg: string, v1: string, v2: string): string {
	if (!intersects(v1, v2)) {
		warning(`${pkg}@${v1} and ${pkg}@${v2} do not intersect`);
	}
	const { version: v1Min } = minVersion(v1);
	const { version: v2Min } = minVersion(v2);
	return gt(v1Min, v2Min) ? v1 : v2;
}

export const getUrl = async function (release: string): Promise<string> {
	const version = clean(release);
	const {
		data: { repository },
	} = await client.query<GetReleaseByTagQuery>({
		query: GetReleaseByTagDocument,
		variables: {
			tagName: release,
		},
	});
	const assets = repository?.release?.releaseAssets?.edges.map((edge) => edge.node);
	assets.forEach((asset) => info(`${asset.name}:`));
	return assets.reduce((acc: string, asset): string => {
		if (asset.name === `aws-cdk-${version}.zip`) {
			acc = asset.url;
		}
		return acc;
	}, null);
};

export const downloadSource = async function (url: string): Promise<string> {
	info(`downloading from: ${url}`);
	const filename = getFilename(url);
	const dirPath = join(process.cwd(), "tmp");
	const filePath = join(process.cwd(), `tmp/${filename}`);
	await ensureDir(dirPath);
	if (await pathExists(filePath)) {
		info(`source file already downloaded: ${filePath}`);
		return filePath;
	}
	const rest = new RestClient("download");
	const stream: NodeJS.WritableStream = createWriteStream(filePath);
	const { message } = await rest.client.get(url);
	return new Promise<string>((resolve) => {
		message.pipe(stream).on("close", () => {
			stream.end();
			info(`downloaded source to: ${filePath}`);
			resolve(filePath);
		});
	});
};

export const getPackages = async function (filePath: string): Promise<CDKPackage[]> {
	const data = await promises.readFile(filePath);
	const zip = await loadAsync(data);
	const packages = await Promise.all(
		zip
			.folder("js")
			.filter((relativePath) => {
				return relativePath.endsWith(".tgz");
			})
			.map((file) => {
				return new Promise<CDKPackage[]>((resolve) => {
					const pkgs: CDKPackage[] = [];
					file.nodeStream()
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
											const pkg: CDKPackage = JSON.parse(json);
											pkgs.push(pkg);
										} catch (err) {
											warning(err.message);
										}
									})
									.on("error", (err) => {
										warning(err.message);
									});
							}
							stream.resume();
						})
						.on("finish", () => resolve(pkgs));
				});
			}),
	);
	return orderBy(
		[].concat([], ...packages).filter((pkg) => Boolean(pkg)),
		"name",
	).map((pkg) => {
		info(JSON.stringify(pkg, null, "\t"));
		return pkg;
	});
};

type CDKPackage = {
	name: string;
	version: string;
	stability: string;
	dependencies: Record<string, string>;
	devDependnecies: Record<string, string>;
	peerDependencies: Record<string, string>;
};

type PackageTypes = {
	stable: CDKPackage[];
	experimental: CDKPackage[];
	deprecated: CDKPackage[];
	unknown: CDKPackage[];
};

type DependencyGraph = Record<string, string>;

export const parsePackages = async function (packages: CDKPackage[]): Promise<DependencyGraph> {
	const { stable, experimental, deprecated, unknown } = packages.reduce(
		(acc, pkg): PackageTypes => {
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
			return Object.entries(acc).reduce((sorted, [key, pkgs]) => {
				sorted[key] = orderBy(pkgs, "name");
				return sorted;
			}, {} as PackageTypes);
		},
		{ stable: [], experimental: [], deprecated: [], unknown: [] } as PackageTypes,
	);
	startGroup(`  — stable ${stable.length}:`);
	stable.forEach((pkg) => info(pkg.name));
	endGroup();
	startGroup(`  — experimental ${experimental.length}:`);
	experimental.forEach((pkg) => info(pkg.name));
	endGroup();
	startGroup(`  — deprecated ${deprecated.length}:`);
	deprecated.forEach((pkg) => info(pkg.name));
	endGroup();
	startGroup(`  — unknown ${unknown.length}:`);
	unknown.forEach((pkg) => info(pkg.name));
	endGroup();
	return [stable, experimental].flat().reduce((acc, { name, version, peerDependencies = {} }): DependencyGraph => {
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
	}, {} as DependencyGraph);
};
