import { Router } from 'express';
import { redis } from '../queue.js';

const router = Router();

router.get('/', async (req, res, next) => {
    try {
        const ping = await redis.ping();
        res.json({
            status: 'ok',
            redis: ping === 'PONG' ? 'connected' : 'unknown',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(503).json({
            status: 'degraded',
            redis: 'disconnected'
        });
    }
});

export default router;
