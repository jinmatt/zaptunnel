import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // Test file patterns
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/cli.ts', // Entry point - tested via E2E
        'dist/**',
        'node_modules/**',
        'tests/**',
      ],
      thresholds: {
        lines: 45,
        branches: 45,
        functions: 50,
        statements: 45,
      },
    },
    
    // Timeout for async operations (longer for real cloudflared tests)
    testTimeout: 45000,
    hookTimeout: 10000,
    
    // Enable globals for easier testing
    globals: true,
    
    // Source maps for debugging
    sourcemap: true,
    
    // Disable threading for consistent test execution
    threads: false,
  },
});
