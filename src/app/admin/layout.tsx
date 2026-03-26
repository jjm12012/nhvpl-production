import Link from 'next/link';
import { auth } from '@/auth';
import { Trophy } from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';

async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // If not authenticated, render children without sidebar (login page)
  // The middleware handles redirecting unauthenticated users away from protected routes
  if (!session) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-6 h-6 text-primary-400" />
            <h1 className="text-xl font-bold">NHVPL Admin</h1>
          </div>
          <p className="text-xs text-gray-400">New Haven Pickleball League</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-6 space-y-2">
          <Link
            href="/admin/dashboard"
            className="block px-4 py-3 rounded-lg hover:bg-gray-800 transition font-medium text-sm"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/events"
            className="block px-4 py-3 rounded-lg hover:bg-gray-800 transition font-medium text-sm"
          >
            Events
          </Link>
          <Link
            href="/admin/registrants"
            className="block px-4 py-3 rounded-lg hover:bg-gray-800 transition font-medium text-sm"
          >
            Registrants
          </Link>
        </nav>

        {/* User Section */}
        <div className="p-6 border-t border-gray-800">
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-1">Logged in as</p>
            <p className="text-sm font-medium truncate">{session.user?.email}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;
