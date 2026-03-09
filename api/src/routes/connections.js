import { Router } from 'express';
import Joi from 'joi';
import { authMiddleware } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { addJob, getJobStatus } from '../queue.js';

const router = Router();

router.post('/send', authMiddleware, validateBody(Joi.object({
    accountId: Joi.string().pattern(/^[a-zA-Z0-9_-]{1,128}$/).required(),
    profileUrl: Joi.string().uri().required(),
    note: Joi.string().max(300).optional(),
    recipientName: Joi.string().max(100).optional(),
    senderName: Joi.string().max(100).optional(),
    topic: Joi.string().max(100).optional(),
    proxyUrl: Joi.string().uri().optional()
})), async (req, res, next) => {
    try {
        const job = await addJob('connect', req.body);
        res.status(201).json({ jobId: job.id, status: 'queued' });
    } catch (err) { next(err); }
});

export default router;
