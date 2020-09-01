// eslint-disable-next-line
const { copy, readJson, writeJson } = require("fs-extra");
// eslint-disable-next-line
const { resolve } = require("path");

// eslint-disable-next-line
const makePath = (str) => resolve(__dirname, str);

async function main() {
	// eslint-disable-next-line
	const pkg = await readJson(resolve(__dirname, "../package.json"));
	pkg.scripts = {
		start: "node index.mjs",
	};
	delete pkg.devDependencies;
	pkg.type = "module";
	pkg.module = pkg.module.replace("src/", "").replace(".ts", ".mjs");
	// TODO: Restore when typescript plugins is fixed
	//pkg.types = pkg.main.replace(".js", ".d.ts");
	await writeJson(makePath("../dist/package.json"), pkg, { spaces: "\t" });
	await copy(makePath("../.gitignore"), makePath("../dist/.gitignore"));
	await copy(makePath("../yarn.lock"), makePath("../dist/yarn.lock"));
	await copy(makePath("../src/entrypoint.sh"), makePath("../dist/entrypoint.sh"));
	await copy(makePath("../src/action.yml"), makePath("../dist/action.yml"));
	await copy(makePath("../src/Dockerfile"), makePath("../dist/Dockerfile"));
	await copy(makePath("../README.md"), makePath("../dist/README.md"));
	await copy(makePath("../LICENSE"), makePath("../dist/LICENSE"));
	await copy(makePath("../.dependabot"), makePath("../dist/.dependabot"));
	await copy(makePath("../.github"), makePath("../dist/.github"));
}

main();
