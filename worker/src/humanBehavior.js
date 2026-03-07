export const delay = (minMs, maxMs) => {
    const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise(resolve => setTimeout(resolve, ms));
};

export const humanClick = async (page, selector) => {
    const element = await page.waitForSelector(selector, { timeout: 15000 });
    const box = await element.boundingBox();
    if (!box) throw new Error('Element not visible for clicking');

    const x = box.x + (box.width * 0.2) + (Math.random() * box.width * 0.6);
    const y = box.y + (box.height * 0.2) + (Math.random() * box.height * 0.6);

    await page.mouse.move(x, y, { steps: 12 });
    await delay(100, 300);
    await page.mouse.click(x, y);
};

export const humanType = async (page, selector, text) => {
    await humanClick(page, selector);
    await delay(200, 500);

    for (const char of text) {
        await page.keyboard.type(char, { delay: 60 + Math.random() * 100 });
        if (Math.random() < 0.03) {
            await delay(400, 900);
        }
    }
};

export const humanScroll = async (page, distancePx) => {
    const steps = 8 + Math.floor(Math.random() * 5);
    const stepSize = distancePx / steps;

    for (let i = 0; i < steps; i++) {
        await page.mouse.wheel(0, stepSize);
        await delay(30, 80);
    }
};
