import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { 
  Users, 
  MessageSquare, 
  Link2, 
  Activity,
  TrendingUp,
  Shield,
  Clock
} from "lucide-react";

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
  const activeAccounts = data.accounts.filter((a: any) => a.status === "active").length;
  const totalAccounts = data.accounts.length;
  const avgTrustScore = data.accounts.length > 0
    ? Math.round(data.accounts.reduce((sum: number, a: any) => sum + (a.trustScore || 0), 0) / data.accounts.length)
    : 0;

  const stats = [
    { 
      name: "Total Accounts", 
      value: totalAccounts, 
      icon: Users,
      trend: "+2 this week",
      color: "blue"
    },
    { 
      name: "Active Accounts", 
      value: activeAccounts, 
      icon: Shield,
      trend: "All systems operational",
      color: "green"
    },
    { 
      name: "Avg Trust Score", 
      value: `${avgTrustScore}%`, 
      icon: TrendingUp,
      trend: avgTrustScore > 70 ? "Excellent" : "Needs attention",
      color: avgTrustScore > 70 ? "green" : "yellow"
    },
    { 
      name: "Messages Today", 
      value: "—", 
      icon: MessageSquare,
      trend: "Coming soon",
      color: "purple"
    },
  ];

  return (
    <DashboardLayout user={{
      userId: payload.userId || 'admin',
      email: payload.email || 'admin@localhost',
      role: payload.role || 'user'
    }}>
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/60 text-sm">System Operational</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-white/60">Manage your LinkedIn automation accounts</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/60 text-sm mb-1">{stat.name}</p>
                    <p className="text-3xl font-bold text-white mb-2">{stat.value}</p>
                    <p className="text-xs text-white/40">{stat.trend}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-${stat.color}-500/20`}>
                    <Icon className={`w-6 h-6 text-${stat.color}-400`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>LinkedIn Accounts</CardTitle>
              <a 
                href="/accounts/new" 
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                + Add Account
              </a>
            </CardHeader>
            <CardContent>
              {data.accounts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                    <Users className="w-8 h-8 text-white/30" />
                  </div>
                  <p className="text-white/60 mb-2">No accounts configured yet</p>
                  <p className="text-white/40 text-sm">Add your first LinkedIn account to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.accounts.map((account: any, index: number) => (
                    <div 
                      key={account.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 hover:border-white/10"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <span className="text-lg font-bold text-white/80">
                            {account.displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{account.displayName}</h3>
                          <p className="text-sm text-white/50">{account.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <Badge 
                            variant={
                              account.status === "active" ? "success" : 
                              account.status === "quarantined" ? "warning" : 
                              account.status === "banned" ? "error" : "default"
                            }
                          >
                            {account.status}
                          </Badge>
                          <p className="text-xs text-white/40 mt-1">
                            Trust: {account.trustScore}%
                          </p>
                        </div>
                        <Activity className={`w-5 h-5 ${
                          account.status === "active" ? "text-green-400" : "text-white/20"
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { icon: MessageSquare, text: "Message sent", time: "2 min ago", color: "blue" },
                  { icon: Link2, text: "Connection request", time: "15 min ago", color: "green" },
                  { icon: Clock, text: "Rate limit warning", time: "1 hour ago", color: "yellow" },
                ].map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-${activity.color}-500/20 flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 text-${activity.color}-400`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm">{activity.text}</p>
                        <p className="text-white/40 text-xs">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6 pt-4 border-t border-white/10">
                <button className="w-full text-center text-sm text-white/60 hover:text-white transition-colors">
                  View all activity →
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <button className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left border border-white/5 hover:border-white/10">
                  <MessageSquare className="w-5 h-5 text-blue-400 mb-2" />
                  <p className="text-white text-sm font-medium">Send Message</p>
                  <p className="text-white/40 text-xs">Quick compose</p>
                </button>
                <button className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left border border-white/5 hover:border-white/10">
                  <Link2 className="w-5 h-5 text-green-400 mb-2" />
                  <p className="text-white text-sm font-medium">New Connection</p>
                  <p className="text-white/40 text-xs">Send request</p>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
