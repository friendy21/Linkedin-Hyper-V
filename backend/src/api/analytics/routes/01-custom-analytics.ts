/**
 * Custom Analytics Routes
 * 
 * Exposes GET /api/analytics/dashboard as a public endpoint
 * for fetching analytics dashboard data (mock or real GA4 data)
 */

export default {
    routes: [
        {
            method: 'GET',
            path: '/analytics/dashboard',
            handler: 'analytics.getDashboardData',
            config: {
                // No auth: false — default is authenticated. Analytics data is sensitive.
                policies: [],
                middlewares: [],
            },
        },
    ],
};
