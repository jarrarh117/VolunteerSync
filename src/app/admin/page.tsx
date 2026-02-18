
'use client'
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/components/admin/admin-auth-provider';
import { useEffect } from 'react';
import AdminDashboardLayout from '@/components/admin/admin-dashboard-layout';
import AnalyticsOverview from '@/components/admin/analytics-overview';
import Starfield from '@/components/auth/starfield';

export default function AdminDashboardPage() {
  const { user, loading, isAdmin } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user || !isAdmin) {
        router.push('/admin/login');
      }
    }
  }, [user, loading, isAdmin, router]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="w-screen h-screen bg-background flex items-center justify-center overflow-hidden">
        <Starfield />
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AdminDashboardLayout>
        <AnalyticsOverview />
    </AdminDashboardLayout>
  );
}
