import type { Core } from '@strapi/strapi';

export default (policyContext: any, config: Record<string, unknown>, { strapi }: { strapi: Core.Strapi }) => {
    const ctx = policyContext;

    // Safety check — ensure ctx and ctx.state exist
    if (!ctx || !ctx.state) {
        strapi.log.warn('is-tenant-scoped: No context or state available');
        return false;
    }

    // Super-admins bypass all tenant restrictions
    const isSuperAdmin = ctx.state.user?.roles?.some((role: any) =>
        role.code === 'strapi-super-admin'
    );
    if (isSuperAdmin) {
        strapi.log.debug('is-tenant-scoped: Super-admin request, bypassing tenant check');
        return true;
    }

    const isReadOperation   = ctx.request?.method === 'GET';
    const isWriteOperation  = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(ctx.request?.method);
    const hasTenantContext  = !!ctx.state.tenant;

    // ─── Authenticated user with tenant ────────────────────────────────────────
    if (ctx.state.user && hasTenantContext) {
        const tenantId: number        = ctx.state.tenant.id;          // integer — required by Strapi
        const tenantDocumentId: string = ctx.state.tenant.documentId; // UUID — used for query filters only

        if (isReadOperation) {
            ctx.query              = ctx.query              ?? {};
            ctx.query.filters      = ctx.query.filters      ?? {};
            // Query filters accept documentId for relation lookups
            ctx.query.filters.tenant = { documentId: tenantDocumentId };
            strapi.log.debug(`is-tenant-scoped: Filtering reads for tenant ${ctx.state.tenant.name}`);
        }

        if (['POST', 'PUT', 'PATCH'].includes(ctx.request?.method)) {
            if (ctx.request.body?.data) {
                // IMPORTANT: Strapi relations MUST use { connect: [{ id: <integer> }] }
                // Assigning a raw UUID string is silently discarded — tenant would be saved as NULL.
                ctx.request.body.data.tenant = { connect: [{ id: tenantId }] };
            }
            strapi.log.debug(`is-tenant-scoped: Injecting tenant id=${tenantId} on write`);
        }

        return true;
    }

    // ─── Unauthenticated public request ────────────────────────────────────────
    // Writes without tenant context are denied
    if (isWriteOperation && !hasTenantContext) {
        strapi.log.debug('is-tenant-scoped: Write without tenant context — denied');
        return false;
    }

    // Reads without tenant context are allowed (public API)
    if (isReadOperation && !hasTenantContext) {
        strapi.log.debug('is-tenant-scoped: Public read allowed without tenant context');
        return true;
    }

    // Unauthenticated request but tenant context was resolved from headers
    if (hasTenantContext) {
        const tenantId: number         = ctx.state.tenant.id;
        const tenantDocumentId: string = ctx.state.tenant.documentId;

        if (isReadOperation) {
            ctx.query              = ctx.query         ?? {};
            ctx.query.filters      = ctx.query.filters ?? {};
            ctx.query.filters.tenant = { documentId: tenantDocumentId };
        }

        if (['POST', 'PUT', 'PATCH'].includes(ctx.request?.method)) {
            if (ctx.request.body?.data) {
                ctx.request.body.data.tenant = { connect: [{ id: tenantId }] };
            }
        }
    }

    return true;
};
