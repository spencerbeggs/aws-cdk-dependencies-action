import chalk from "chalk";
import { cwd } from "process";
import { exec } from "child_process";
import { promisify } from "util";

const { green } = chalk;
const cmd = promisify(exec);

async function main() {
	let stdout, stderr;
	({ stdout, stderr } = await cmd(`docker build -t aws-cdk-dependencies/debug:latest .`, {
		cwd: `${cwd()}/dist`,
	}));
	console.log(stderr ? stderr : stdout);
	console.log(
		`${green(
			"Run debug build:",
		)} docker run -e "PORT=3000" -e "NODE_ENV=development" --publish 8080:3000 --detach --name aws-cdk-dependencies aws-cdk-dependencies/debug:latest`,
	);
	console.log(`${green("Follow logs:")} docker logs --follow aws-cdk-dependencies`);
	console.log(`${green("Attach to container:")} docker exec -it aws-cdk-dependencies /bin/sh`);
	console.log(`${green("Reset build:")} docker stop aws-cdk-dependencies && docker rm aws-cdk-dependencies`);
}

main();
