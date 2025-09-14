import './globals.css'
import { ThemeProvider } from '../src/contexts/ThemeContext'

export const metadata = {
  title: 'GYANDHARA - AI-Powered Learning Platform',
  description: 'Low-bandwidth online learning platform for rural students with interactive whiteboard and parent portal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
