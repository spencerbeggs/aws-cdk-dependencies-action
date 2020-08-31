import { exportVariable, getInput, group, info, setFailed, setOutput } from "@actions/core";
import { downloadSource, getPackages, getUrl, parsePackages } from "./main";

export async function main(): Promise<void> {
	try {
		const release = process.env.RELEASE ?? getInput("release");
		const url = await group(`Getting download URL for AWS CDK release ${release}`, getUrl.bind(null, release));
		info(url);
		const source = await group(`Downloading ${url}`, downloadSource.bind(null, url));
		info(source);
		const packages = await group(`Getting packages from ${source}`, getPackages.bind(null, source));
		const output = await group(`Parsing ${packages.length} packages`, parsePackages.bind(null, packages));
		setOutput("dependencies", output);
		exportVariable("dependencies", output);
	} catch (err) {
		info(err);
		setFailed(`Action failed with error ${err}`);
	}
}

export default main();
