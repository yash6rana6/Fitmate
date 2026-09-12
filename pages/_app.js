import Script from 'next/script';
import Head from 'next/head';
import { useEffect } from 'react';
import '../styles/globals.css';
import { ToastProvider } from '../components/Toast';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      <ToastProvider>
        <div className="min-h-screen bg-base max-w-md mx-auto">
          <Component {...pageProps} />
        </div>
      </ToastProvider>
    </>
  );
}
