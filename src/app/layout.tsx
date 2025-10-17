import 'mdb-react-ui-kit/dist/css/mdb.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './globals.css';
import { AuthProvider } from '@/lib/auth/authContext';
import { DateRangeProvider } from '@/lib/context/DateRangeContext';

export const metadata = {
  title: 'GrowReporter - 統合Web分析プラットフォーム',
  description: 'Google Analytics 4、Search Consoleを統合したAI分析プラットフォーム',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body suppressHydrationWarning={true}>
        <AuthProvider>
          <DateRangeProvider>
            {children}
          </DateRangeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
