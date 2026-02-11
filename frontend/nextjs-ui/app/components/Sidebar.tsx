'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      className={`block px-4 py-2 rounded-lg transition-colors
        ${isActive
          ? 'bg-slate-900 text-white'
          : 'hover:bg-slate-100 text-slate-700'
        }`}
    >
      {label}
    </Link>
  )
}

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r shadow-sm fixed h-full">
      <div className="p-6 border-b">
        <h1 className="text-xl font-semibold">Mjolnir</h1>
      </div>

      <nav className="p-4 space-y-2 text-sm">
        <NavLink href="/" label="Dashboard" />
        <NavLink href="/logs" label="Logs" />
        <NavLink href="/incidents" label="Incidents" />
      </nav>
    </aside>
  )
}
