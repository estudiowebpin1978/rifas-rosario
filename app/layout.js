import './globals.css'

export const metadata = {
  title: 'RIFA SMART - Rosario',
  description: 'Sistema de rifas en Rosario',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}