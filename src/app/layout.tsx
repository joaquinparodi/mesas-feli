import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/providers/Providers';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'MesaVIP - Reserva tu Mesa VIP',
    template: '%s | MesaVIP',
  },
  description:
    'Reserva las mejores mesas VIP en los eventos mas exclusivos. Mapa 3D interactivo, pago seguro con MercadoPago y confirmacion instantanea con QR.',
  keywords: [
    'reserva mesa VIP',
    'eventos',
    'nightclub',
    'boliche',
    'mesa',
    'reserva',
    'QR',
    'MercadoPago',
  ],
  openGraph: {
    title: 'MesaVIP - Reserva tu Mesa VIP',
    description:
      'Reserva las mejores mesas VIP en los eventos mas exclusivos.',
    type: 'website',
    locale: 'es_AR',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-[#0a0a1a] text-white min-h-screen`}
      >
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
