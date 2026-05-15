import './globals.css'

export const metadata = {
  title: 'Rifas Rosario - Gana Zapatillas, Celulares y más!',
  description: 'Las mejores rifas en Rosario - Participá y ganá! Zapatillas, Celulares, Tecnología y mucho más por un pago mínimo.',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Rifas Rosario',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="transition-colors antialiased">
        {children}
      </body>
    </html>
  )
}