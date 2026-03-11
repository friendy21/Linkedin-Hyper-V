export default {
    async beforeCreate(event: {
        params: { data: Record<string, unknown> };
        state?: { tenant?: Record<string, unknown> };
    }) {
        const { data } = event.params;

        console.log('📧 Regulatethis Subscriber beforeCreate hook triggered');

        // Safely check for tenant in event state (only available for API requests, not admin panel)
        const eventState = event?.state;
        const tenantContext = eventState?.tenant;

        // Auto-assign tenant from context if available and not already set
        // Note: Admin panel requests may not have tenant context - this is OK
        if (!data.tenant && tenantContext) {
            // Use documentId for Strapi 5.x (not id)
            data.tenant = tenantContext.documentId || tenantContext.id;
        }

        // Set default subscribedAt if not provided
        if (!data.subscribedAt) {
            data.subscribedAt = new Date().toISOString();
        }

        // Normalize subscriptionMethod (Map legacy values to "Email")
        if (data.subscriptionMethod && typeof data.subscriptionMethod === 'string') {
            const invalidMethods = ['Free', 'CreditCard', 'PayPal', 'BankTransfer', 'Manual', 'Cryptocurrency'];
            if (invalidMethods.includes(data.subscriptionMethod)) {
                data.subscriptionMethod = 'Email';
            }
        }

        // Normalize subscriptionStatus
        if (data.subscriptionStatus && typeof data.subscriptionStatus === 'string') {
            const originalStatus = data.subscriptionStatus;
            let normalizedStatus = originalStatus.toLowerCase().trim();

            if (['unactive', 'inactive', 'unsubscribe', 'unsubscribed'].includes(normalizedStatus)) {
                normalizedStatus = 'unsubscribed';
            } else if (['active', 'subscribed'].includes(normalizedStatus)) {
                normalizedStatus = 'subscribed';
            }

            if (normalizedStatus !== data.subscriptionStatus) {
                data.subscriptionStatus = normalizedStatus;
            }
        }

        // Default subscriptionStatus
        if (!data.subscriptionStatus) {
            data.subscriptionStatus = 'subscribed';
        }
    },

    async beforeUpdate(event: { params: { data: Record<string, unknown> } }) {
        const { data } = event.params;

        console.log('📧 Regulatethis Subscriber beforeUpdate hook triggered');

        // Normalize subscriptionStatus if being updated
        if (data.subscriptionStatus && typeof data.subscriptionStatus === 'string') {
            const originalStatus = data.subscriptionStatus;
            let normalizedStatus = originalStatus.toLowerCase().trim();

            if (['unactive', 'inactive', 'unsubcribe', 'unsubscribe', 'unsubscribed'].includes(normalizedStatus)) {
                normalizedStatus = 'unsubscribed';
            } else if (['active', 'subscribed'].includes(normalizedStatus)) {
                normalizedStatus = 'subscribed';
            }

            if (normalizedStatus !== data.subscriptionStatus) {
                data.subscriptionStatus = normalizedStatus;
            }
        }

        // If subscriptionStatus is being changed to unsubscribed, set unsubscribeAt
        if (data.subscriptionStatus === 'unsubscribed' && !data.unsubscribeAt) {
            data.unsubscribeAt = new Date().toISOString();
        }
    },
};
