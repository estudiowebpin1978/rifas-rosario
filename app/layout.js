import './globals.css'

export const metadata = {
  title: 'Rifas Rosario',
  description: 'Las mejores rifas en Rosario',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <meta property="fb:app_id" content="YOUR_FACEBOOK_APP_ID" />
        <script async defer src="https://connect.facebook.net/es_LA/sdk.js#xfbml=1&version=v18.0&appId=YOUR_FACEBOOK_APP_ID" crossOrigin="anonymous"></script>
      </head>
      <body className="bg-gray-100 dark:bg-gray-900 transition-colors">
        {children}
      </body>
    </html>
  )
}