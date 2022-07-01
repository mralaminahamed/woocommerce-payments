const { jestPuppeteerConfig } = require( '@automattic/puppeteer-utils' );

// Use this config to run puppeteer in interactive mode ({ headless: false }).
const config = {
	...jestPuppeteerConfig,
	launch: {
		...jestPuppeteerConfig.launch,
		args: [ '--disable-dev-shm-usage' ],
	},
};

module.exports = config;
