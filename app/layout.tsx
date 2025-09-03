import './globals.css'

export const metadata = {
  title: 'VoiceBoard - AI-Powered Learning Platform',
  description: 'Low-bandwidth online learning platform for rural students',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
