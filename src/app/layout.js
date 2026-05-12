import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';

const inter = Inter({ subsets: ['latin'] });

// export const metadata = {
//   title: 'Question Bank - Admin Panel',
//   description: 'Manage your question bank efficiently',
// };

export const metadata = {
  title: 'Question Bank - Admin Panel',
  description: 'Manage your question bank efficiently',
  icons: {
    icon: '/logo.png',
  },
};


export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <MainLayout>{children}</MainLayout>
        </AuthProvider>
      </body>
    </html>
  );
}