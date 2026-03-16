'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import api from '@/lib/api';

const NAV = [
  { href: '/setup',     label: 'Setup' },
  { href: '/instances', label: 'Instances' },
  { href: '/deploy',    label: 'Deploy' },
  { href: '/backups',   label: 'Backups' },
  { href: '/ssl',       label: 'SSL' },
  { href: '/git',       label: 'Git' },
];

export default function Sidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    await api.post('/auth/logout').catch(() => null);
    window.location.href = '/login';
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] bg-zinc-900 border-r border-zinc-800 flex flex-col">
      <div className="px-5 py-4 border-b border-zinc-800">
        <img src="/logo.png" alt="Logo" className="h-7 w-auto" />
      </div>

      <nav className="flex-1 py-2">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-5 py-2 text-[14px] transition-colors duration-150 ${
                active
                  ? 'text-white bg-zinc-800'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-zinc-800">
        <button
          onClick={handleLogout}
          className="text-[13px] text-zinc-500 hover:text-red-400 transition-colors duration-150"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
