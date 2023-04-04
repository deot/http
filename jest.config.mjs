import options from '@deot/dev-cli/config/jest.config.js';

export default {
	...options,
	moduleNameMapper: {
		'^@deot/http$': '<rootDir>/packages/index/src',
		'^@deot/http-(.*?)$': '<rootDir>/packages/$1/src'
	}
};
