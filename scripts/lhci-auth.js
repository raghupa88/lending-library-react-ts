module.exports = async (browser, context) => {
    // launch browser for LHCI
    const page = await browser.newPage();
    await page.goto('http://localhost:4173/login');

    // Wait for inputs
    await page.waitForSelector('input[type="email"]');
    await page.waitForSelector('input[type="password"]');

    // Type credentials
    await page.type('input[type="email"]', 'member@example.com');
    await page.type('input[type="password"]', 'password123');

    // Click submit
    const submitBtn = await page.waitForSelector('button[type="submit"]');
    await Promise.all([
        page.waitForNavigation(),
        submitBtn.click(),
    ]);

    // Close page
    await page.close();
};
