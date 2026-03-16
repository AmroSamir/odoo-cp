import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Odoo Manager',
  description: 'Odoo 19 Enterprise Management Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
