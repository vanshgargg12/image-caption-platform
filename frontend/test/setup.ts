import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global mocks for URL.createObjectURL and URL.revokeObjectURL
if (typeof window !== 'undefined') {
  if (typeof globalThis.Blob !== 'undefined') {
    window.Blob = globalThis.Blob;
  }
  if (typeof globalThis.File !== 'undefined') {
    window.File = globalThis.File;
  }
  if (typeof window.Blob !== 'undefined' && !window.Blob.prototype.arrayBuffer) {
    window.Blob.prototype.arrayBuffer = function () {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(this);
      });
    };
  }

  window.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-preview-url');
  window.URL.revokeObjectURL = vi.fn();

  if (!window.createImageBitmap) {
    window.createImageBitmap = vi.fn().mockImplementation(async () => ({
      width: 100,
      height: 100,
      close: vi.fn(),
    }));
  }
  if (!globalThis.createImageBitmap) {
    globalThis.createImageBitmap = window.createImageBitmap;
  }

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}
