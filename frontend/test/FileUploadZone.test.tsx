import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FileUploadZone from '../components/FileUploadZone';

describe('FileUploadZone Component', () => {
  const mockOnFileSelected = vi.fn();

  beforeEach(() => {
    mockOnFileSelected.mockClear();
    vi.clearAllMocks();
  });

  it('renders upload dropzone instructions', () => {
    render(<FileUploadZone onFileSelected={mockOnFileSelected} selectedFile={null} />);
    expect(screen.getByText(/Click to choose image/i)).toBeInTheDocument();
    expect(screen.getByText(/JPEG or PNG \(Max 10MB\)/i)).toBeInTheDocument();
  });

  it('accepts valid JPEG file and invokes callback', () => {
    const validFile = new File(['fake-jpeg-content'], 'test.jpg', { type: 'image/jpeg' });
    const { container } = render(<FileUploadZone onFileSelected={mockOnFileSelected} selectedFile={null} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [validFile] } });

    expect(mockOnFileSelected).toHaveBeenCalledWith(validFile);
  });

  it('shows error for invalid file type', () => {
    const invalidFile = new File(['fake-txt'], 'document.pdf', { type: 'application/pdf' });
    const { container } = render(<FileUploadZone onFileSelected={mockOnFileSelected} selectedFile={null} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [invalidFile] } });

    expect(screen.getByRole('alert')).toHaveTextContent(/Only JPEG and PNG images are supported/i);
    expect(mockOnFileSelected).toHaveBeenCalledWith(null);
  });

  it('shows error for oversized file exceeding 10MB', () => {
    const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.png', { type: 'image/png' });
    const { container } = render(<FileUploadZone onFileSelected={mockOnFileSelected} selectedFile={null} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [largeFile] } });

    expect(screen.getByRole('alert')).toHaveTextContent(/File size exceeds the 10MB maximum limit/i);
    expect(mockOnFileSelected).toHaveBeenCalledWith(null);
  });

  it('renders image preview when selectedFile is provided', () => {
    const file = new File(['content'], 'sample.png', { type: 'image/png' });
    render(<FileUploadZone onFileSelected={mockOnFileSelected} selectedFile={file} />);

    const img = screen.getByAltText(/Preview of selected image: sample.png/i);
    expect(img).toBeInTheDocument();
    expect(screen.getByText(/Remove Selected Image/i)).toBeInTheDocument();
  });

  it('revokes object URL when image is removed', () => {
    const file = new File(['content'], 'sample.png', { type: 'image/png' });
    const { rerender } = render(<FileUploadZone onFileSelected={mockOnFileSelected} selectedFile={file} />);

    expect(window.URL.createObjectURL).toHaveBeenCalled();

    rerender(<FileUploadZone onFileSelected={mockOnFileSelected} selectedFile={null} />);
    expect(window.URL.revokeObjectURL).toHaveBeenCalled();
  });
});
