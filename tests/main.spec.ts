import { main } from "../src/main";

describe("main()", (): void => {
	it("rejects if you are not logged in", async () => {
		try {
			await main();
		} catch (err) {
			expect(err).toEqual(new Error("Parameter token or opts.auth is required"));
		}
	});
});
