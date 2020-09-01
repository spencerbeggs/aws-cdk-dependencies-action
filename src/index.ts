import { endGroup, exportVariable, getInput, group, info, setFailed, setOutput, startGroup } from "@actions/core";
import { downloadSource, getPackages, getUrl, parsePackages } from "./main";

export async function main(): Promise<void> {
	try {
		const release = process.env.RELEASE ?? getInput("release");
		const url = await group(`Getting release assets for AWS CDK ${release}`, getUrl.bind(null, release));
		const source = await group("Downloading JavaScript source bundle", downloadSource.bind(null, url));
		const packages = await group(`Getting packages from ${source}`, getPackages.bind(null, source));
		info(`Parsing ${packages.length} packages:`);
		const output = await parsePackages(packages);
		info(`Parsing ${packages.length} packages:`);
		startGroup(`Generated dependencies JSON for ${release}`);
		info(JSON.stringify(output, null, "\t"));
		endGroup();
		setOutput("dependencies", output);
		exportVariable("dependencies", output);
	} catch (err) {
		info(err);
		setFailed(`Action failed with error ${err}`);
	}
}

export default main();
