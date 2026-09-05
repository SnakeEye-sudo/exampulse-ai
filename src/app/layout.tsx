import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/components/AppProvider';
import { Shell } from '@/components/Shell';

export const metadata: Metadata = {
  title: 'ExamPulse AI — Current Affairs for Government Exams',
  description:
    'Daily current affairs turned into exam-oriented revision: relevance scoring, syllabus mapping, static GK, AI-generated MCQs and a spaced-repetition revision engine for UPSC, BPSC, State PCS, SSC, Banking, Railway, Defence, Police and Teaching aspirants.',
  applicationName: 'ExamPulse AI',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'ExamPulse', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon-192.png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf9f6' },
    { media: '(prefers-color-scheme: dark)', color: '#111214' },
  ],
};

// Set the theme class before first paint so a dark-mode user never gets a
// white flash on a 6am study session.
const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem('exampulse.theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>
        <AppProvider>
          <Shell>{children}</Shell>
        </AppProvider>
      </body>
    </html>
  );
}
