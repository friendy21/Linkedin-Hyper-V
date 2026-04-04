import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatsGrid from "@/components/dashboard/StatsGrid";
import AccountList from "@/components/dashboard/AccountList";
import RecentActivity from "@/components/dashboard/RecentActivity";

async function getDashboardData() {
  try {
    const response = await fetch(`${process.env.API_URL}/api/accounts`, {
      headers: {
        "x-api-secret": process.env.API_SECRET || "",
      },
      next: { revalidate: 30 },
    });

    if (!response.ok) throw new Error("Failed to fetch accounts");
    return response.json();
  } catch (error) {
    return { accounts: [] };
  }
}

export default async function DashboardPage() {
  // Check authentication
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  
  if (!token) {
    redirect("/login");
  }

  const payload = await verifyToken(token);
  if (!payload) {
    redirect("/login");
  }

  const data = await getDashboardData();

  return (
    <DashboardLayout user={payload}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Manage your LinkedIn automation accounts</p>
        </div>

        <StatsGrid accounts={data.accounts} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AccountList accounts={data.accounts} />
          </div>
          <div>
            <RecentActivity />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
