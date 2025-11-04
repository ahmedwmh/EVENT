import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Artists Event Registration",
  description: "Register for the artists gathering event",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  )
}

