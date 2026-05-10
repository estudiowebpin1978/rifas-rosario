import './globals.css'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'

export const metadata = {
  title: 'RIFA SMART - Rosario',
  description: 'Sistema de rifas en Rosario',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-gray-100 dark:bg-gray-900 transition-colors">
        <AuthProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}