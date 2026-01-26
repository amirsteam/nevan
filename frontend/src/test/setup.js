import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Clear RTL after each test
afterEach(() => {
  cleanup();
});
