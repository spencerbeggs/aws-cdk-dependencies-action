import chalk from "chalk";
import * as inquirer from "inquirer";
import * as prettier from "prettier";

import { emptyDir, readFile, copy, readJson, remove, writeFile } from "fs-extra";

import { exec } from "child-process-promise";
import { resolve } from "path";

function path(rel: string): string {
	return resolve(__dirname, rel);
}

async function run(cmd: string): Promise<string> {
	const ret = await exec(cmd);
	return ret.stdout;
}

interface PackageReturn {
	name: string;
	bypass: boolean;
}

async function updatePackage(): Promise<PackageReturn> {
	console.log(`📦  ${chalk.green("Update package.json with your project settings:")}`);
	const pkg = await readJson(path("../package.json"));
	if (pkg.name !== "typescript-starter") {
		console.log(`⚠️  ${chalk.yellow("Project has already been intialized.")}`);
		const { OVERWRITE } = await inquirer.prompt([
			{
				type: "confirm",
				name: "OVERWRITE",
				default: false,
				message: "Overwrite project?",
			},
		]);
		if (!OVERWRITE) {
			return {
				name: pkg.name,
				bypass: true,
			};
		}
	}
	const { NAME, DESCRIPTION, VERSION } = await inquirer.prompt([
		{ type: "input", name: "NAME", message: "name:", default: "my-project" },
		{ type: "input", name: "DESCRIPTION", message: "description:", default: "" },
		{ type: "input", name: "VERSION", message: "version:", default: "0.0.0" },
	]);
	pkg.name = NAME;
	if (DESCRIPTION) {
		pkg.description = DESCRIPTION;
	} else {
		delete pkg.description;
	}
	pkg.version = VERSION;
	let remote = null;
	try {
		remote = await run("git config --get remote.origin.url");
		if (remote.startsWith("git@github.com:")) {
			remote = `https://github.com/${remote.replace("git@github.com:", "").trim()}`;
		}
	} catch {}
	const { REPO_URL } = await inquirer.prompt([
		{
			type: "input",
			name: "REPO_URL",
			message: "repo url:",
			default: remote.trim(),
		},
	]);
	if (REPO_URL) {
		pkg.repository.url = REPO_URL;
	} else {
		delete pkg.repository;
	}
	let authorDefault = "";
	try {
		const authorName = await run("git config user.name");
		authorDefault = authorName.trim();
	} catch {}
	try {
		let authorEmail = await run("git config user.email");
		authorEmail = authorEmail.trim();
		if (!authorDefault) {
			authorDefault = authorEmail;
		} else {
			authorDefault = `${authorDefault} <${authorEmail}>`;
		}
	} catch {}
	const { AUTHOR } = await inquirer.prompt([
		{
			type: "input",
			name: "AUTHOR",
			message: "author",
			default: authorDefault,
		},
	]);
	if (AUTHOR) {
		pkg.author = AUTHOR;
	} else {
		delete pkg.author;
	}
	const { USE_DEPENDABOT } = await inquirer.prompt([
		{
			type: "confirm",
			name: "USE_DEPENDABOT",
			message: "Use Dependabot integration?",
			default: true,
		},
	]);
	if (USE_DEPENDABOT) {
		const { DEPENDABOT_BRANCH } = await inquirer.prompt([
			{
				type: "input",
				name: "DEPENDABOT_BRANCH",
				message: "Dependabot branch to track?",
				default: "develop",
			},
		]);
		const dependabotConfigFileData = await readFile(path("../.dependabot/config.yml"));
		await writeFile(
			path("../.dependabot/config.yml"),
			dependabotConfigFileData.toString().replace(/target_branch: develop/g, `target_branch: ${DEPENDABOT_BRANCH}`),
		);
	} else {
		await remove(path("../.dependabot"));
	}
	const { USE_GIT_HOOKS } = await inquirer.prompt([
		{
			type: "confirm",
			name: "USE_GIT_HOOKS",
			message: "Use Git commit hooks?",
			default: true,
		},
	]);
	if (!USE_GIT_HOOKS) {
		await remove(path("../husky.config.js"));
	}
	const prettierOptions = await prettier.resolveConfig(path("../.prettierrc"));
	console.log(prettierOptions);
	await writeFile(path("../package.json"), prettier.format(JSON.stringify(pkg, null, "\t"), prettierOptions));
	return {
		name: pkg.name,
		bypass: false,
	};
}

export async function cleanDemoFiles(bypass = false): Promise<void> {
	if (!bypass) {
		await emptyDir(path("../src"));
		await emptyDir(path("../tests"));
		console.log(`🗑️  ${chalk.green("Deleted demo files")}`);
	}
}

export async function addInitFiles(bypass = false): Promise<void> {
	if (!bypass) {
		const { ADD_INIT_FILES } = await inquirer.prompt([
			{
				type: "confirm",
				message: "Add base files?",
				name: "ADD_INIT_FILES",
				default: true,
			},
		]);
		if (ADD_INIT_FILES) {
			await copy(path("./assets/index.ts"), path("../src/index.ts"));
			await copy(path("./assets/main.spec.ts"), path("../tests/main.spec.ts"));
		}
		console.log(`🧬  ${chalk.green("Added init files")}`);
	}
}

export async function writeDocs(bypass: boolean, name: string): Promise<void> {
	if (!bypass) {
		const readmeFileData = await readFile(path("./assets/README.md"));
		await writeFile(path("../README.md"), readmeFileData.toString().replace("typescript-starter", name));
		console.log(`📄  ${chalk.green("Updated root README")}`);
	}
}

export async function init(): Promise<void> {
	const { bypass, name } = await updatePackage();
	await cleanDemoFiles(bypass);
	await addInitFiles(bypass);
	await writeDocs(bypass, name);
}

if (process.argv.includes("init")) {
	init();
}

if (process.argv.includes("files")) {
	addInitFiles();
}
