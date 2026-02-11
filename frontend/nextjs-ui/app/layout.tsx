import './globals.css'
import type { ReactNode } from 'react'
import Sidebar from './components/Sidebar'

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-slate-800">
        <div className="flex min-h-screen">
          
          <Sidebar />

          <main className="flex-1 p-8 ml-64">
            {children}
          </main>

        </div>
      </body>
    </html>
  )
}
