
'use client'
import AdminDashboardLayout from "@/components/admin/admin-dashboard-layout";
import TaskMonitoring from "@/components/admin/task-monitoring";

export default function AdminTasksPage() {
  return (
    <AdminDashboardLayout>
      <TaskMonitoring />
    </AdminDashboardLayout>
  );
}
