import './globals.css';
import React from 'react';

export const metadata = {
  title: 'LearnAble Full Ready App',
  description: 'NotebookLM-style local study workspace with AI and demo modes.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
