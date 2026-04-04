import Link from "next/link";
import { User, Activity, AlertCircle } from "lucide-react";

interface Account {
  id: string;
  displayName: string;
  email: string;
  status: string;
  trustScore: number;
  lastActiveAt: string | null;
}

interface AccountListProps {
  accounts: Account[];
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  quarantined: "bg-yellow-100 text-yellow-800",
  banned: "bg-red-100 text-red-800",
  warming: "bg-blue-100 text-blue-800",
};

export default function AccountList({ accounts }: AccountListProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">LinkedIn Accounts</h2>
          <Link
            href="/accounts/new"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Add Account
          </Link>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {accounts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No accounts configured yet</p>
            <p className="text-sm mt-1">Add your first LinkedIn account to get started</p>
          </div>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              className="p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {account.displayName}
                    </h3>
                    <p className="text-sm text-gray-500">{account.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[account.status] || statusColors.inactive
                      }`}
                    >
                      {account.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Trust Score: {account.trustScore}/100
                    </p>
                  </div>

                  {account.status === "active" && (
                    <Activity className="w-5 h-5 text-green-500" />
                  )}
                  {account.status === "quarantined" && (
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  )}
                </div>
              </div>

              {account.lastActiveAt && (
                <p className="mt-2 text-xs text-gray-400">
                  Last active: {new Date(account.lastActiveAt).toLocaleString()}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
