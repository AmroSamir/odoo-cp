'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import api from '@/lib/api';

const NAV = [
  { href: '/setup',     label: 'Setup',         icon: '⚙' },
  { href: '/instances', label: 'Instances',    icon: '▦' },
  { href: '/deploy',    label: 'Deploy',        icon: '⬆' },
  { href: '/backups',   label: 'Backups',       icon: '💾' },
  { href: '/ssl',       label: 'SSL',           icon: '🔒' },
  { href: '/git',       label: 'Git',           icon: '⎇' },
];

export default function Sidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    await api.post('/auth/logout').catch(() => null);
    window.location.href = '/login';
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-[220px] bg-gray-900 border-r border-gray-800 flex flex-col z-10">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-800">
        <div className="text-lg font-bold text-white tracking-tight">ODOO MANAGER</div>
        <div className="text-xs text-gray-500 mt-0.5">Odoo 19 Enterprise</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                active
                  ? 'bg-odoo-purple text-white font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span className="w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-4 py-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full text-left text-sm text-gray-500 hover:text-red-400 px-2 py-1 transition-colors"
        >
          ⏏ Logout
        </button>
      </div>
    </aside>
  );
}
