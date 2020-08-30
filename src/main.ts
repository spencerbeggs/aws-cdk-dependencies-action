import { debug, exportVariable, getInput, group, info, setFailed, setOutput, warning } from "@actions/core";
import { createWriteStream, promises } from "fs";
import { ensureDir, pathExists } from "fs-extra";
import gunzip from "gunzip-maybe";
import { loadAsync } from "jszip";
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

async function download(url) {
	debug(`downloading: ${url}`);
	const filename = getFilename(url);
	const dirPath = join(process.cwd(), "tmp");
	const filePath = join(process.cwd(), `tmp/${filename}`);
	await ensureDir(dirPath);
	if (await pathExists(filePath)) {
		debug(`source file already downloaded: ${filePath}`);
		return filePath;
	}
	const rest = new RestClient("download");
	const stream: NodeJS.WritableStream = createWriteStream(filePath);
	const { message } = await rest.client.get(url);
	return new Promise<string>((resolve) => {
		message.pipe(stream).on("close", () => {
			stream.end();
			debug(`downloaded source to: ${filePath}`);
			resolve(filePath);
		});
	});
}

type PackageJson = Record<string, unknown>;

async function getPackages(filePath: string) {
	debug(`parsing packages from: ${filePath}`);
	const data = await promises.readFile(filePath);
	const zip = await loadAsync(data);
	return Promise.all(
		zip
			.folder("js")
			.filter((relativePath) => {
				return relativePath.endsWith(".tgz");
			})
			.map((file) => {
				return new Promise<PackageJson[]>((resolve) => {
					const pkgs: PackageJson[] = [];
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
											const pkg = JSON.parse(json);
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
	).then((arr) => {
		const packages = [].concat([], ...arr).filter((item) => Boolean(item));
		debug(`parsed ${Object.values(packages).length} packages`);
		return Promise.resolve(packages);
	});
}

function normalizeVersions(pkg: string, v1: string, v2: string): string {
	if (!intersects(v1, v2)) {
		warning(`${pkg}@${v1} and ${pkg}@${v2} do not intersect`);
	}
	const { version: v1Min } = minVersion(v1);
	const { version: v2Min } = minVersion(v2);
	return gt(v1Min, v2Min) ? v1 : v2;
}

export async function main(): Promise<void> {
	try {
		const release = process.env.RELEASE ?? getInput("release");
		const version = clean(release);
		const url = await group(
			`Getting download URL for AWS CDK release ${release}`,
			async (): Promise<string> => {
				const {
					data: { repository },
				} = await client.query<GetReleaseByTagQuery>({
					query: GetReleaseByTagDocument,
					variables: {
						tagName: release,
					},
				});
				const assets = repository?.release?.releaseAssets?.edges.map((edge) => edge.node);
				info(`found ${assets.length} assets:`);
				assets.forEach(({ name }) => info(`   — ${name}`));
				return assets.reduce((acc: string, asset): string => {
					if (asset.name === `aws-cdk-${version}.zip`) {
						acc = asset.url;
					}
					return acc;
				}, null);
			},
		);
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
		debug(`  — stable: ${stable.length}`);
		debug(`  — experimental: ${experimental.length}`);
		debug(`  — deprecated: ${deprecated.length}`);
		debug(`  — unknown: ${unknown.length}`);
		const output = [stable, experimental].flat().reduce((acc, { name, version, peerDependencies = {} }): Record<
			string,
			string
		> => {
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
		debug(output);
		setOutput("dependencies", output);
		exportVariable("dependencies", output);
	} catch (err) {
		info(err);
		setFailed(`Action failed with error ${err}`);
	}
}
