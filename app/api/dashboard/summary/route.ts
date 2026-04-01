// FILE: app/api/dashboard/summary/route.ts
// Returns a summary of dashboard data in a single call to avoid N+1 queries
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { query } from '@/lib/db';

interface DashboardSummary {
  unreadMessages: number;
  pendingConnections: number;
  recentNotifications: number;
  totalAccounts: number;
  activeAccounts: number;
}

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.userId;

    // Get all counts in parallel using efficient SQL queries
    const [
      unreadMessagesResult,
      recentConnectionsResult,
      recentNotificationsResult,
      accountsResult,
    ] = await Promise.all([
      // Count messages not sent by me (received messages) that are recent
      // Since we don't have an explicit "read" field, we count recent messages as "unread"
      query(`
        SELECT COUNT(*) as count 
        FROM messages m
        JOIN linkedin_accounts la ON m.linked_in_account_id = la.id
        WHERE la.user_id = $1 
        AND m.is_sent_by_me = false
        AND m.sent_at > NOW() - INTERVAL '24 hours'
      `, [userId]),
      
      // Count recent connections (last 30 days)
      query(`
        SELECT COUNT(*) as count 
        FROM connections c
        JOIN linkedin_accounts la ON c.linked_in_account_id = la.id
        WHERE la.user_id = $1 
        AND c.created_at > NOW() - INTERVAL '30 days'
      `, [userId]),
      
      // Count recent notifications (last 24 hours)
      query(`
        SELECT COUNT(*) as count 
        FROM notifications n
        JOIN linkedin_accounts la ON n.linked_in_account_id = la.id
        WHERE la.user_id = $1 
        AND n.received_at > NOW() - INTERVAL '24 hours'
      `, [userId]),
      
      // Count total and active LinkedIn accounts
      query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active
        FROM linkedin_accounts 
        WHERE user_id = $1
      `, [userId]),
    ]);

    const summary: DashboardSummary = {
      unreadMessages: parseInt(unreadMessagesResult.rows[0]?.count || '0', 10),
      pendingConnections: parseInt(recentConnectionsResult.rows[0]?.count || '0', 10),
      recentNotifications: parseInt(recentNotificationsResult.rows[0]?.count || '0', 10),
      totalAccounts: parseInt(accountsResult.rows[0]?.total || '0', 10),
      activeAccounts: parseInt(accountsResult.rows[0]?.active || '0', 10),
    };

    return NextResponse.json({ summary });
  } catch (error) {
    // Log error securely
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Dashboard summary error:', error);
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch dashboard summary' },
      { status: 500 }
    );
  }
}
