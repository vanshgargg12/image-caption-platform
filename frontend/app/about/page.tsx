import React from 'react';

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">About & Model Information</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Technical specifications and model metadata for the Image Caption Platform.
        </p>
      </header>

      <section className="space-y-4 text-gray-800 dark:text-gray-200 leading-relaxed">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Primary Vision Model</h2>
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
          <p><span className="font-semibold">Model ID:</span> Xenova/vit-gpt2-image-captioning</p>
          <p><span className="font-semibold">Runtime:</span> Node.js ONNX Inference (Transformers.js v3)</p>
          <p><span className="font-semibold">Execution Mode:</span> Pure JavaScript/TypeScript (No Python dependencies)</p>
          <p><span className="font-semibold">Supported Image Formats:</span> JPEG (`.jpg`, `.jpeg`) and PNG (`.png`)</p>
          <p><span className="font-semibold">Max File Size:</span> 10 Megabytes (10,485,760 bytes)</p>
        </div>

        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-6">Architecture Overview</h2>
        <p>
          The Image Caption Platform follows an API-first multi-tier architecture:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm">
          <li>
            <strong className="text-gray-900 dark:text-gray-100">Next.js App Router Frontend:</strong> Accessible user interface providing drag-and-drop upload, image previews, local caption editing, JSON downloads, and feedback submission.
          </li>
          <li>
            <strong className="text-gray-900 dark:text-gray-100">Spring Boot Public Backend:</strong> Java 21 REST API handling request validation, magic-byte header checks, SHA-256 image hashing, Flyway database migrations, and PostgreSQL persistence.
          </li>
          <li>
            <strong className="text-gray-900 dark:text-gray-100">Node.js Internal Inference Service:</strong> HTTP inference daemon executing ONNX vision transformer models with single-concurrency queue protection.
          </li>
        </ul>
      </section>
    </div>
  );
}
