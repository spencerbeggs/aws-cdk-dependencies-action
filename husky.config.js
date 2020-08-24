module.exports = {
	hooks: {
		"post-checkout": "yarn install",
		//"pre-commit": "yarn lint",
	},
};
