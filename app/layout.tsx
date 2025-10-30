import './globals.css'; // Você precisará criar este arquivo CSS
import { Inter } from 'next/font/google';
import { AuthProvider } from '../lib/auth-context';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Sparked Sense',
  description: 'Verifiable Data Streams for IoT',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark"> {/* Forçando o modo escuro como exemplo */}
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
