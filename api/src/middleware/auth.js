import crypto from 'crypto';

export const authMiddleware = (req, res, next) => {
    const apiKey = req.get('X-Api-Key');
    const secret = process.env.API_SECRET;

    if (!apiKey || !secret) {
        return res.status(401).json({ error: 'Unauthorised' });
    }

    const apiKeyBuffer = Buffer.from(apiKey);
    const secretBuffer = Buffer.from(secret);

    if (apiKeyBuffer.length !== secretBuffer.length || !crypto.timingSafeEqual(apiKeyBuffer, secretBuffer)) {
        return res.status(401).json({ error: 'Unauthorised' });
    }

    next();
};
