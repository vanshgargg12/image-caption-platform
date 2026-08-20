import type { Metadata } from 'next';
import './globals.css';
import QueryProvider from '../components/providers/QueryProvider';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export const metadata: Metadata = {
  title: 'Image Caption Platform',
  description: 'Functional, accessible AI-powered image captioning engine',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <QueryProvider>
          <Navbar />
          <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <Footer />
        </QueryProvider>
      </body>
    </html>
  );
}
