/** @type {import('jest').Config} */
module.exports = {
	preset: 'ts-jest/presets/default-esm',
	testEnvironment: 'jsdom',
	extensionsToTreatAsEsm: ['.ts', '.tsx'],
	setupFilesAfterEnv: ['./jest/setupTestFramework.ts'],
	collectCoverageFrom: ['src/**/*.{ts,tsx}'],
	coverageReporters: ['cobertura', 'lcov', 'text-summary'],
	coverageDirectory: '<rootDir>/coverage',
	roots: ['<rootDir>/src'],
	testRegex: '\\.spec\\.tsx?$',
	moduleNameMapper: {
		'\\.css$': 'identity-obj-proxy'
	},
	transform: {
		'^.+\\.(t|j)sx?$': [
			'ts-jest',
			{
				tsconfig: './tsconfig.test.json',
				useESM: true
			}
		]
	}
}
