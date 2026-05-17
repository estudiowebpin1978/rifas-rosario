import './globals.css'

export const metadata = {
  title: 'Eco Rifas - Los productos que amas, ahora los podes ganar en rifas economicas!',
  description: 'Los productos que amas, ahora los podes ganar en rifas economicas! Sorteo transparente por Quiniela Nacional. Premios increibles.',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Eco Rifas',
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