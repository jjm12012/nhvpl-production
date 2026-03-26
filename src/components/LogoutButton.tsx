'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

export default function LogoutButton() {
  const handleLogout = async () => {
    try {
      await signOut({ redirect: true, callbackUrl: '/' });
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
    >
      <LogOut className="w-4 h-4" />
      Logout
    </button>
  );
}
