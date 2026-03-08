import crypto from 'crypto';

/**
 * Generates a random hex string of given byte length.
 * @param {number} [byteLength=32]
 * @returns {string}
 */
export function randomHex(byteLength = 32) {
    return crypto.randomBytes(byteLength).toString('hex');
}

/**
 * Generates a random base64url string of given byte length.
 * @param {number} [byteLength=32]
 * @returns {string}
 */
export function randomToken(byteLength = 32) {
    return crypto.randomBytes(byteLength).toString('base64url');
}

/**
 * Generates a random alphanumeric string.
 * @param {number} [length=16]
 * @returns {string}
 */
export function randomAlphanumeric(length = 16) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
        result += charset[bytes[i] % charset.length];
    }
    return result;
}

const OPENERS = [
    "Hi {name},",
    "Hello {name},",
    "Hey {name},",
    "Greetings {name},",
    "Hi there {name},"
];

const DISCOVERY_REASONS = [
    "I came across your profile while researching {topic}.",
    "I noticed your work in {topic} and was really impressed.",
    "Your background in {topic} caught my eye.",
    "We share a mutual interest in {topic}.",
    "I saw your recent activity regarding {topic}."
];

const CONNECTION_INTENTS = [
    "I'd love to connect and keep in touch.",
    "It would be great to add you to my network.",
    "I'd appreciate the opportunity to connect.",
    "Let's connect and share insights.",
    "Hoping to connect and follow your journey."
];

const VALUE_PROPS = [
    "I'm always looking to engage with experts in {topic}.",
    "I enjoy connecting with professionals shaping the future of {topic}.",
    "Building a network with leaders in {topic} is a priority for me.",
    "I regularly share resources about {topic} that you might find valuable.",
    "I believe we could both benefit from exchanging ideas on {topic}."
];

const CALLS_TO_ACTION = [
    "Let me know if you're open to connecting.",
    "Would be great to hear your thoughts sometime.",
    "Feel free to accept if you're open to it.",
    "Looking forward to potentially connecting.",
    "Hope to see you in my feed!"
];

const CLOSINGS = [
    "Best, {sender}",
    "Cheers, {sender}",
    "Regards, {sender}",
    "Warmly, {sender}",
    "Thanks, {sender}"
];

const TOPICS_DEFAULT = [
    "tech innovation",
    "software engineering",
    "leadership",
    "industry trends",
    "digital transformation",
    "product development",
    "startups",
    "design thinking",
    "data science",
    "agile methodologies"
];

const selectRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const render = (template, vars) => {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
        if (value) {
            result = result.replace(new RegExp(`{${key}}`, 'g'), value);
        } else {
            result = result.replace(new RegExp(`\\s*{${key}}\\s*`, 'g'), ' ');
        }
    }
    return result.replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ').trim();
};

const enforceLimit = (text) => {
    const limit = 295;
    if (text.length <= limit) return text;
    const trimmed = text.substring(0, limit);
    const lastSpace = trimmed.lastIndexOf(' ');
    if (lastSpace > 0) {
        return trimmed.substring(0, lastSpace);
    }
    return trimmed;
};

/**
 * Generates a connection note.
 * @param {Object} [opts={}]
 * @param {string} [opts.recipientName='']
 * @param {string} [opts.senderName='']
 * @param {string} [opts.topic='']
 * @returns {string}
 */
export function generateConnectionNote(opts = {}) {
    const vars = {
        name: opts.recipientName || 'there',
        sender: opts.senderName || '',
        topic: opts.topic || selectRandom(TOPICS_DEFAULT)
    };

    const parts = [
        selectRandom(OPENERS),
        selectRandom(DISCOVERY_REASONS),
        selectRandom(CONNECTION_INTENTS),
        selectRandom(CLOSINGS)
    ];

    let message = parts.join(' ');
    message = render(message, vars);
    return enforceLimit(message);
}

/**
 * Generates an outreach message.
 * @param {Object} [opts={}]
 * @param {string} [opts.recipientName='']
 * @param {string} [opts.senderName='']
 * @param {string} [opts.topic='']
 * @returns {string}
 */
export function generateOutreachMessage(opts = {}) {
    const vars = {
        name: opts.recipientName || 'there',
        sender: opts.senderName || '',
        topic: opts.topic || selectRandom(TOPICS_DEFAULT)
    };

    const parts = [
        selectRandom(OPENERS),
        selectRandom(DISCOVERY_REASONS),
        selectRandom(VALUE_PROPS),
        selectRandom(CALLS_TO_ACTION),
        selectRandom(CLOSINGS)
    ];

    let message = parts, msg = parts.join(' ');
    msg = render(msg, vars);
    return enforceLimit(msg);
}

/**
 * Generates a follow up message.
 * @param {Object} [opts={}]
 * @param {string} [opts.recipientName='']
 * @param {string} [opts.senderName='']
 * @param {string} [opts.topic='']
 * @param {string} [opts.context='']
 * @returns {string}
 */
export function generateFollowUpMessage(opts = {}) {
    const vars = {
        name: opts.recipientName || 'there',
        sender: opts.senderName || '',
        topic: opts.topic || selectRandom(TOPICS_DEFAULT),
        context: opts.context || 'our last conversation'
    };

    const followUpOpeners = [
        "Hi {name}, following up on {context}.",
        "Hello {name}, just circling back.",
        "Hey {name}, hope you're doing well."
    ];

    const parts = [
        selectRandom(followUpOpeners),
        selectRandom(VALUE_PROPS),
        selectRandom(CALLS_TO_ACTION),
        selectRandom(CLOSINGS)
    ];

    let message = parts.join(' ');
    message = render(message, vars);
    return enforceLimit(message);
}

/**
 * Generates a batch of unique content strings.
 * @param {'connectionNote'|'outreach'|'followUp'} type
 * @param {number} [count=10]
 * @param {Object} [opts={}]
 * @returns {string[]}
 */
export function generateContentBatch(type, count = 10, opts = {}) {
    const limit = Math.min(count, 100);
    const results = new Set();
    const maxAttempts = limit * 3;
    let attempts = 0;

    const generators = {
        connectionNote: generateConnectionNote,
        outreach: generateOutreachMessage,
        followUp: generateFollowUpMessage
    };

    const generator = generators[type];
    if (!generator) return [];

    while (results.size < limit && attempts < maxAttempts) {
        results.add(generator(opts));
        attempts++;
    }

    return [...results].slice(0, limit);
}
