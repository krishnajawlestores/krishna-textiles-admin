import './globals.css';
import AdminShell from '@/components/AdminShell';
import { ThemeProvider } from './ThemeContext';
import { ModalProvider } from './ModalContext';

export const metadata = {
  title: 'Krishna Jawli Stores - Enterprise Management Portal',
  description: 'Enterprise ERP for Krishna Jawli Stores: Inventory, Order Fulfillment, CRM & Analytics',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('kt_admin_theme');
                if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                } else {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="bg-slate-50 dark:bg-[#080C14] text-slate-900 dark:text-slate-100 h-screen overflow-hidden antialiased flex transition-colors duration-200">
        <ThemeProvider>
          <ModalProvider>
            <AdminShell>{children}</AdminShell>
          </ModalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
