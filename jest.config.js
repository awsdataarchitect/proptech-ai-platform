// Jest configuration for PropTech Search Platform

module.exports = {
  preset: 'ts-jest/presets/default',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        target: 'ES2020',
        module: 'commonjs',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        strict: false,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: false,
        isolatedModules: false,
        noImplicitAny: false,
        strictNullChecks: false,
        strictFunctionTypes: false,
        strictBindCallApply: false,
        strictPropertyInitialization: false,
        noImplicitReturns: false,
        noImplicitThis: false,
        alwaysStrict: false
      }
    }],
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.config.ts',
    '!src/**/*.mock.ts',
    '!src/test-utils/**/*',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json', 'json-summary', 'clover'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testTimeout: 30000,
  verbose: false,
  
  // Module name mapping for absolute imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
  },
  
  // Test environment variables
  setupFiles: ['<rootDir>/test/env.setup.ts'],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Test result processors
  testResultsProcessor: '<rootDir>/test/config/test-results-processor.js',
  
  // Error handling
  errorOnDeprecated: false,
  
  // Performance monitoring
  detectOpenHandles: false,
  detectLeaks: false,
  
  // Parallel execution
  maxWorkers: '50%',
  
  // Cache configuration
  cacheDirectory: '<rootDir>/.jest-cache',
};
