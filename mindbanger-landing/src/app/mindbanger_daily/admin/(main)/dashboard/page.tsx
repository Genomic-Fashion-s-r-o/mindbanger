"use client";
import MfaLock from "@/components/admin/AdminDashboard";
import AdminPanel from '@/components/admin/AdminPanel';

export default function AdminPage() {
  return <MfaLock><div className="admin-daily-panel"><h1 className="admin-daily-title">Mindbanger Daily</h1><AdminPanel /></div></MfaLock>;
}
