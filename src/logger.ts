import { getInput } from "@actions/core";
import { inspect } from "util";

type LogMessage = Array<string> | Record<string, unknown> | string | Error;

export function log(obj: LogMessage): void {
	console.log(inspect(obj, false, 7, true));
}

export function debug(obj: LogMessage): void {
	const isDebug = process.env.DEBUG == "true" || getInput("debug") === "true";
	if (isDebug) {
		if (Array.isArray(obj)) {
			obj.forEach((item) => log(item));
		} else if (obj !== null && typeof obj === "object") {
			log(obj);
		} else if (typeof obj === "string") {
			console.log(obj);
		}
	}
}
