import type { Metadata } from 'next';
import './admin.css';
export const metadata: Metadata = { title: 'Administrácia | Mindbanger' };
export default function AdminRootLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <div className="admin-root">{children}</div>
    );
  }
