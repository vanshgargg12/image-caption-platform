import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-auto bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-600 dark:text-gray-400">
        <p className="mb-2">
          Image Caption Platform — AI-Powered Captioning Engine (ViT-GPT2 ONNX)
        </p>
        <div className="flex justify-center space-x-6">
          <Link href="/about" className="hover:underline focus-visible:ring-2 focus-visible:ring-blue-600 rounded">
            Model Details
          </Link>
          <Link href="/privacy" className="hover:underline focus-visible:ring-2 focus-visible:ring-blue-600 rounded">
            Privacy Policy & Limitations
          </Link>
        </div>
      </div>
    </footer>
  );
}
