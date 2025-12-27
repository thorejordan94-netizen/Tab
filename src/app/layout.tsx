import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Extension Foundry - Build Chrome Extensions with AI',
  description:
    'Describe an extension in plain language and get a complete Manifest V3 TypeScript/React extension as a downloadable zip.',
  keywords: [
    'Chrome extension',
    'browser extension',
    'AI',
    'code generation',
    'Manifest V3',
    'TypeScript',
    'React',
  ],
  authors: [{ name: 'Extension Foundry' }],
  openGraph: {
    title: 'Extension Foundry',
    description:
      'Build complete Chrome extensions from plain language descriptions',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
