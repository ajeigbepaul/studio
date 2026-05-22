import { StatCard } from "@/components/dashboard/StatCard";
import { AnalyticsChart } from "@/components/dashboard/AnalyticsChart";
import { PendingVerificationsCard } from "@/components/dashboard/PendingVerificationsCard";
import { mockMonthlyData } from "@/lib/mockData";
import type { Counsellor, ChatStatusData } from '@/lib/types';
import { Users, UserCheck, MessageSquare, ListChecks } from "lucide-react";
import type { ChartConfig } from "@/components/ui/chart";
import { adminDb } from '@/lib/firebase-admin';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Welcome from "@/components/dashboard/Welcome";

export const dynamic = 'force-dynamic';

const monthlyChartConfig = {
  users: { label: "Users", color: "hsl(var(--chart-1))" },
  counsellors: { label: "Counsellors", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const chatStatusChartConfig = {
  Pending: { label: "Pending", color: "hsl(var(--chart-1))" },
  Active: { label: "Active", color: "hsl(var(--chart-2))" },
  Resolved: { label: "Resolved", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

async function getCounsellorsForDashboard(): Promise<Counsellor[]> {
  try {
    const snapshot = await adminDb.collection('counselors').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => {
      const data = doc.data();

      let status: Counsellor['status'] = 'Pending';
      if (data.status && ["Pending", "Verified", "Rejected"].includes(data.status)) {
        status = data.status as Counsellor['status'];
      } else {
        status = data.isVerified ? 'Verified' : 'Pending';
      }

      let createdAtString = new Date().toISOString();
      if (data.createdAt?.toDate) {
        createdAtString = data.createdAt.toDate().toISOString();
      }

      return {
        id: doc.id,
        personalInfo: {
          fullName: data.personalInfo?.fullName || 'N/A',
          email: data.personalInfo?.email || 'N/A',
          phoneNumber: data.personalInfo?.phoneNumber,
          profilePic: data.personalInfo?.profilePic ||
            `https://placehold.co/150x150.png?text=${(data.personalInfo?.fullName || 'N').charAt(0)}`,
        },
        professionalInfo: { occupation: data.professionalInfo?.occupation },
        createdAt: createdAtString,
        isVerified: data.isVerified || false,
        status,
      } as Counsellor;
    });
  } catch (error) {
    console.error("Error fetching counsellors for dashboard:", error);
    return [];
  }
}

async function getUsersCount(): Promise<number> {
  try {
    const snapshot = await adminDb.collection('users').count().get();
    return snapshot.data().count;
  } catch (error) {
    console.error("Error fetching users count:", error);
    return 0;
  }
}

async function getChatStats(): Promise<{ pending: number; active: number; resolved: number }> {
  try {
    const [pending, active, resolved] = await Promise.all([
      adminDb.collection('posts').where('status', '==', 'pending').count().get(),
      adminDb.collection('posts').where('status', '==', 'accepted').count().get(),
      adminDb.collection('posts').where('status', '==', 'completed').count().get(),
    ]);
    return {
      pending:  pending.data().count,
      active:   active.data().count,
      resolved: resolved.data().count,
    };
  } catch (error) {
    console.error("Error fetching chat stats:", error);
    return { pending: 0, active: 0, resolved: 0 };
  }
}

export default async function DashboardPage() {
  const [counsellors, totalUsersCount, chatStats] = await Promise.all([
    getCounsellorsForDashboard(),
    getUsersCount(),
    getChatStats(),
  ]);

  const chatStatusForPieChart: ChatStatusData[] = [
    { name: 'Pending',  value: chatStats.pending,  fill: 'var(--color-chart-1)' },
    { name: 'Active',   value: chatStats.active,   fill: 'var(--color-chart-2)' },
    { name: 'Resolved', value: chatStats.resolved, fill: 'var(--color-chart-3)' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
        <Welcome />
        <div className="flex items-center gap-4">
          <Link href="/invite?userType=counselor">
            <Button className="bg-primary text-white">+ Invite Counsellor</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Link href="/admins" className="cursor-pointer">
          <StatCard title="Total Users" value={totalUsersCount} icon={Users} description="Registered users" />
        </Link>
        <Link href="/counsellors" className="cursor-pointer">
          <StatCard title="Total Counsellors" value={counsellors.length} icon={UserCheck} description="Counsellors on platform" />
        </Link>
        <Link href="/counsellors?status=pending" className="cursor-pointer">
          <StatCard title="Pending Chats" value={chatStats.pending} icon={MessageSquare} description="Awaiting counsellor response" />
        </Link>
        <Link href="/counsellors?status=active" className="cursor-pointer">
          <StatCard title="Active Chats" value={chatStats.active} icon={MessageSquare} description="Ongoing conversations" className="text-primary" />
        </Link>
        <Link href="/counsellors?status=resolved" className="cursor-pointer">
          <StatCard title="Resolved Cases" value={chatStats.resolved} icon={ListChecks} description="Successfully concluded" />
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="md:col-span-2 lg:col-span-2">
          <AnalyticsChart
            title="User & Counsellor Growth"
            description="Monthly registration trends"
            data={mockMonthlyData}
            chartType="line"
            config={monthlyChartConfig}
            dataKeys={["users", "counsellors"]}
            xAxisDataKey="month"
            className="h-full"
          />
        </div>
        <div>
          <AnalyticsChart
            title="Chat Status Overview"
            description="Distribution of chat statuses"
            data={chatStatusForPieChart}
            chartType="pie"
            config={chatStatusChartConfig}
            dataKeys={[{ name: "value" }]}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold mb-2">Pending Verifications</h2>
          <PendingVerificationsCard counsellors={counsellors} />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Recent Activity</h2>
          <div className="bg-muted rounded-lg p-4 text-muted-foreground text-sm">No recent activity yet.</div>
        </div>
      </div>
    </div>
  );
}
