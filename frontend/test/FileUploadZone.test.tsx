import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FileUploadZone from '../components/FileUploadZone';

describe('FileUploadZone Component', () => {
  const mockOnFileSelected = vi.fn();

  const VALID_JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x00, 0x01, 0x01, 0x01]);
  const VALID_PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const VALID_WEBP_BYTES = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, // RIFF
    0x24, 0x00, 0x00, 0x00,
    0x57, 0x45, 0x42, 0x50, // WEBP
  ]);

  beforeEach(() => {
    mockOnFileSelected.mockClear();
    vi.clearAllMocks();

    // Default mock for createImageBitmap in JSDOM
    if (!window.createImageBitmap) {
      window.createImageBitmap = vi.fn();
    }
    vi.mocked(window.createImageBitmap).mockResolvedValue({
      width: 100,
      height: 100,
      close: vi.fn(),
    } as unknown as ImageBitmap);
  });

  it('renders upload dropzone instructions', () => {
    render(<FileUploadZone onFileSelected={mockOnFileSelected} selectedFile={null} />);
    expect(screen.getByText(/Click to choose image/i)).toBeInTheDocument();
    expect(screen.getByText(/JPEG, PNG, or WebP \(Max 10MB\)/i)).toBeInTheDocument();
  });

  it('accepts valid JPEG file with real signature bytes and invokes callback', async () => {
    const validFile = new File([VALID_JPEG_BYTES], 'test.jpg', { type: 'image/jpeg' });
    const { container } = render(<FileUploadZone onFileSelected={mockOnFileSelected} selectedFile={null} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(mockOnFileSelected).toHaveBeenCalledWith(validFile);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('accepts valid PNG and WebP files with correct signature bytes', async () => {
    const validPng = new File([VALID_PNG_BYTES], 'graphic.png', { type: 'image/png' });
    const { container } = render(<FileUploadZone onFileSelected={mockOnFileSelected} selectedFile={null} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [validPng] } });

    await waitFor(() => {
      expect(mockOnFileSelected).toHaveBeenCalledWith(validPng);
    });

    const validWebp = new File([VALID_WEBP_BYTES], 'photo.webp', { type: 'image/webp' });
    fireEvent.change(input, { target: { files: [validWebp] } });

    await waitFor(() => {
      expect(mockOnFileSelected).toHaveBeenCalledWith(validWebp);
    });
  });

  it('rejects a PDF file renamed to .jpg (not a real JPEG/PNG/WebP)', async () => {
    const pdfBytes = new TextEncoder().encode('%PDF-1.5 simulated pdf content that is not an image');
    const renamedFile = new File([pdfBytes], 'photo.jpg', { type: 'image/jpeg' });
    const { container } = render(<FileUploadZone onFileSelected={mockOnFileSelected} selectedFile={null} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [renamedFile] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/not a real JPEG\/PNG\/WebP/i);
    });
    expect(mockOnFileSelected).toHaveBeenCalledWith(null);
  });

  it('rejects a dropped PDF file renamed to .jpg', async () => {
    const pdfBytes = new TextEncoder().encode('%PDF-1.5 dropped pdf content');
    const renamedFile = new File([pdfBytes], 'document.jpg', { type: 'image/jpeg' });
    render(<FileUploadZone onFileSelected={mockOnFileSelected} selectedFile={null} />);

    const dropzone = screen.getByRole('button', { name: /upload image dropzone/i });
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [renamedFile],
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/not a real JPEG\/PNG\/WebP/i);
    });
    expect(mockOnFileSelected).toHaveBeenCalledWith(null);
  });

  it('rejects undecodable image even when magic bytes match', async () => {
    vi.mocked(window.createImageBitmap).mockRejectedValueOnce(new Error('Corrupt image data'));

    const undecodableFile = new File([VALID_JPEG_BYTES], 'corrupt.jpg', { type: 'image/jpeg' });
    const { container } = render(<FileUploadZone onFileSelected={mockOnFileSelected} selectedFile={null} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [undecodableFile] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/image is corrupt/i);
    });
    expect(mockOnFileSelected).toHaveBeenCalledWith(null);
  });

  it('rejects image when dimensions are below 32x32 px', async () => {
    vi.mocked(window.createImageBitmap).mockResolvedValueOnce({
      width: 16,
      height: 16,
      close: vi.fn(),
    } as unknown as ImageBitmap);

    const smallFile = new File([VALID_JPEG_BYTES], 'small.jpg', { type: 'image/jpeg' });
    const { container } = render(<FileUploadZone onFileSelected={mockOnFileSelected} selectedFile={null} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [smallFile] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/image is too small/i);
    });
    expect(mockOnFileSelected).toHaveBeenCalledWith(null);
  });

  it('shows error for invalid file type extension and mime', async () => {
    const invalidFile = new File(['fake-txt'], 'document.pdf', { type: 'application/pdf' });
    const { container } = render(<FileUploadZone onFileSelected={mockOnFileSelected} selectedFile={null} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Only JPEG, PNG, and WebP images are supported/i);
    });
    expect(mockOnFileSelected).toHaveBeenCalledWith(null);
  });

  it('shows error for oversized file exceeding 10MB', async () => {
    const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.png', { type: 'image/png' });
    const { container } = render(<FileUploadZone onFileSelected={mockOnFileSelected} selectedFile={null} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/File size exceeds the 10MB maximum limit/i);
    });
    expect(mockOnFileSelected).toHaveBeenCalledWith(null);
  });

  it('shows error for empty file', async () => {
    const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' });
    const { container } = render(<FileUploadZone onFileSelected={mockOnFileSelected} selectedFile={null} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [emptyFile] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Selected file is empty/i);
    });
    expect(mockOnFileSelected).toHaveBeenCalledWith(null);
  });

  it('renders image preview when selectedFile is provided', () => {
    const file = new File([VALID_PNG_BYTES], 'sample.png', { type: 'image/png' });
    render(<FileUploadZone onFileSelected={mockOnFileSelected} selectedFile={file} />);

    const img = screen.getByAltText(/Preview of selected image: sample.png/i);
    expect(img).toBeInTheDocument();
    expect(screen.getByText(/Remove Selected Image/i)).toBeInTheDocument();
  });

  it('revokes object URL when image is removed', () => {
    const file = new File([VALID_PNG_BYTES], 'sample.png', { type: 'image/png' });
    const { rerender } = render(<FileUploadZone onFileSelected={mockOnFileSelected} selectedFile={file} />);

    expect(window.URL.createObjectURL).toHaveBeenCalled();

    rerender(<FileUploadZone onFileSelected={mockOnFileSelected} selectedFile={null} />);
    expect(window.URL.revokeObjectURL).toHaveBeenCalled();
  });
});
