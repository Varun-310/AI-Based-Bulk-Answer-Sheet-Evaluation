import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Answer Sheet Evaluator | Bulk IB Evaluation',
  description:
    'AI-powered bulk answer sheet evaluation system. Upload student PDFs, extract text with PaddleOCR, and auto-score using IB evaluation standards.',
  keywords: ['IB evaluation', 'answer sheet', 'OCR', 'AI grading', 'PaddleOCR'],
  openGraph: {
    title: 'AI Answer Sheet Evaluator',
    description: 'Bulk AI-powered evaluation of student answer sheets using IB standards',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
