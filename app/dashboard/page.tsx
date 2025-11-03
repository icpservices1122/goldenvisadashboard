'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect, useState } from 'react';
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
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        console.log('Checking authentication in localStorage...');
        
        // Check for the exact keys your login page uses
        const adminUser = localStorage.getItem('adminUser');
        const adminTokenExpiry = localStorage.getItem('adminTokenExpiry');
        
        console.log('Found adminUser:', adminUser);
        console.log('Found adminTokenExpiry:', adminTokenExpiry);

        if (!adminUser || !adminTokenExpiry) {
          console.log('Missing authentication data, redirecting to login...');
          router.push('/login');
          return;
        }

        // Check if token is expired
        const currentTime = new Date().getTime();
        const expiryTime = parseInt(adminTokenExpiry);
        
        console.log('Current time:', currentTime);
        console.log('Expiry time:', expiryTime);
        console.log('Token valid:', currentTime < expiryTime);

        if (currentTime >= expiryTime) {
          console.log('Token expired, clearing storage and redirecting...');
          localStorage.removeItem('adminUser');
          localStorage.removeItem('adminTokenExpiry');
          router.push('/login');
          return;
        }

        // Authentication is valid
        console.log('Authentication valid, allowing access to dashboard');
        setIsCheckingAuth(false);
        
      } catch (error) {
        console.error('Authentication check failed:', error);
        router.push('/login');
      }
    };

    // Add a small delay to ensure the check runs after component mount
    const timer = setTimeout(() => {
      checkAuth();
    }, 100);

    return () => clearTimeout(timer);
  }, [router]);

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B48B5E] mx-auto"></div>
          <p className="mt-4 text-slate-700">Checking authentication...</p>
        </div>
      </div>
    );
  }

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