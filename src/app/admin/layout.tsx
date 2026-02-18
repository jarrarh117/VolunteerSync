
import { AdminAuthProvider } from "@/components/admin/admin-auth-provider";
import { Toaster } from "@/components/ui/toaster";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <AdminAuthProvider>
        {children}
        <Toaster />
      </AdminAuthProvider>
  );
}
