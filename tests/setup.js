/**
 * Jest setup file for handling global cleanup
 */

// Global cleanup after all tests
afterAll(async () => {
  // Force close any remaining handles
  await new Promise(resolve => setTimeout(resolve, 200));
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Set shorter timeouts for faster test completion
jest.setTimeout(30000);