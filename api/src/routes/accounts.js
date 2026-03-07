import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { redis } from '../queue.js';

const router = Router();

router.post('/:accountId/session', authMiddleware, async (req, res, next) => {
    try {
        const { accountId } = req.params;
        const { cookies } = req.body;
        if (!Array.isArray(cookies)) {
            return res.status(400).json({ error: 'cookies must be an array' });
        }
        await redis.publish('session:import', JSON.stringify({ accountId, cookies }));
        res.json({ success: true, accountId });
    } catch (err) {
        next(err);
    }
});

router.get('/:accountId/limits', authMiddleware, async (req, res, next) => {
    try {
        const { accountId } = req.params;
        const keys = await redis.keys(`ratelimit:${accountId}:*`);
        const limits = {};
        for (const key of keys) {
            const current = await redis.get(key);
            const parts = key.split(':');
            const action = parts[2];
            limits[action] = {
                current: parseInt(current, 10),
            };
        }
        res.json({ limits });
    } catch (err) {
        next(err);
    }
});

router.delete('/:accountId/session', authMiddleware, async (req, res, next) => {
    try {
        const { accountId } = req.params;
        await redis.del(`session:${accountId}`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

export default router;
