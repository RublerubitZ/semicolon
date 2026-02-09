import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import ApiInitializer from "@/components/ApiInitializer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/ToastProvider";
import QueryProvider from "@/components/QueryProvider";
import NetworkStatusBanner from "@/components/NetworkStatusBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "설스터디",
  description: "멘토링 관리 시스템, 설스터디",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" style={{ colorScheme: 'light' }} suppressHydrationWarning>
      <head>
        {/* Pretendard 폰트 */}
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
        {/* S-Core Dream 폰트 */}
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/moonspam/NanumSquare@2.0/nanumsquare.css"
        />
        <style dangerouslySetInnerHTML={{ __html: `
          @font-face {
            font-family: 'S-Core Dream';
            font-weight: 300;
            src: url('https://fastly.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/S-CoreDream-3Light.woff') format('woff');
          }
          @font-face {
            font-family: 'S-Core Dream';
            font-weight: 400;
            src: url('https://fastly.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/S-CoreDream-4Regular.woff') format('woff');
          }
          @font-face {
            font-family: 'S-Core Dream';
            font-weight: 700;
            src: url('https://fastly.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/S-CoreDream-6Bold.woff') format('woff');
          }

          :root {
            color-scheme: light only !important;
            --font-pretendard: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif;
            --font-scoredream: "S-Core Dream", sans-serif;
          }
          @media (prefers-color-scheme: dark) {
            :root, html, body {
              color-scheme: light only !important;
              background: #ffffff !important;
              color: #171717 !important;
            }
          }
        ` }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
        style={{ colorScheme: 'light', fontFamily: 'var(--font-pretendard)' }}
      >
        <ApiInitializer />
        <QueryProvider>
          <NetworkStatusBanner />
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </QueryProvider>
        <ToastProvider />
      </body>
    </html>
  );
}

