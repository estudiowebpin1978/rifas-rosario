import './globals.css'

export const metadata = {
  title: 'Rifas Rosario',
  description: 'Las mejores rifas en Rosario - Participa y gana!',
  manifest: '/manifest.json',
  icons: {
    icon: 'https://tmpfiles.org/dl/37342838/logo.jpg',
    apple: 'https://tmpfiles.org/dl/37342838/logo.jpg',
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