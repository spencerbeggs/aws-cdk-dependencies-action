import { main } from "../../src/index";

describe("main()", (): void => {
	it("resolves the string 'Hello, world!", async () => {
		expect(main()).resolves.toBe("Hello, world!");
	});
});
