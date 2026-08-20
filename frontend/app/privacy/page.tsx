import React from 'react';

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">Privacy & Limitations</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Data handling practices, privacy guarantees, and model limitations.
        </p>
      </header>

      <section className="space-y-4 text-gray-800 dark:text-gray-200 leading-relaxed">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Data & Image Privacy Guarantees</h2>
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3 text-sm">
          <p>
            <strong className="text-green-700 dark:text-green-400">No Permanent Image Storage:</strong> Uploaded images are processed strictly in transient temporary disk buffers during ONNX inference and are automatically deleted upon completion or error on every path.
          </p>
          <p>
            <strong className="text-green-700 dark:text-green-400">Database Privacy:</strong> The PostgreSQL database stores only request metadata (filename, SHA-256 content hash, generated caption text, execution timing, and user feedback). Image binary bytes are never stored in PostgreSQL.
          </p>
          <p>
            <strong className="text-green-700 dark:text-green-400">Browser Memory Hygiene:</strong> Image previews utilize standard Object URLs (`URL.createObjectURL`), which are revoked via `URL.revokeObjectURL` as soon as images are removed or replaced.
          </p>
        </div>

        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-6">Model Limitations & Considerations</h2>
        <ul className="list-disc pl-6 space-y-2 text-sm">
          <li>
            <strong>Hallucination Risk:</strong> Generative vision-language models may occasionally generate inaccurate descriptions, misidentify breeds/objects, or hallucinate scene elements.
          </li>
          <li>
            <strong>File Format Constraints:</strong> Only valid JPEG and PNG files up to 10MB are accepted. GIF, WebP, SVG, and corrupted image buffers will be rejected.
          </li>
          <li>
            <strong>Single Concurrency:</strong> To maintain low memory footprint, the internal inference engine executes requests serially.
          </li>
        </ul>
      </section>
    </div>
  );
}
