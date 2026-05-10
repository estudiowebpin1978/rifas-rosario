import './globals.css'

export const metadata = {
  title: 'Rifas Rosario',
  description: 'Las mejores rifas en Rosario - Participa y gana!',
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