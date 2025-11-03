'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Disable SSR for the dashboard content to avoid localStorage issues during build
const DashboardContent = dynamic(() => import('./dashcontent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B48B5E] mx-auto"></div>
        <p className="mt-4 text-slate-700">Loading Dashboard...</p>
      </div>
    </div>
  ),
});

// Also disable SSR for Logout component
const Logout = dynamic(() => import('../components/LogoutButton'), {
  ssr: false,
});

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = () => {
      // You can modify this check based on your authentication method
      // Common approaches:
      
      // 1. Check for token in localStorage
      const token = localStorage.getItem('authToken');
      // or sessionStorage.getItem('authToken');
      
      // 2. Check for user data in localStorage
      const userData = localStorage.getItem('user');
      
      // 3. Check if both token and user data exist
      if (!token || !userData) {
        router.push('/login');
      }
      
      // Alternative: if you're using a different auth method, adjust accordingly
      // if (!isAuthenticated) {
      //   router.push('/login');
      // }
    };

    checkAuth();
  }, [router]);

  return (
    <>
      <Logout />
      <Suspense fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B48B5E] mx-auto"></div>
            <p className="mt-4 text-slate-700">Loading Dashboard...</p>
          </div>
        </div>
      }>
        <DashboardContent />
      </Suspense>
    </>
  );
}