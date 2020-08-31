import { main } from "../src/index";

describe("main()", (): void => {
	it("rejects if you are not logged in", async () => {
		try {
			await main();
		} catch (err) {
			expect(err).toEqual(new Error("Parameter token or opts.auth is required"));
		}
	});
});
