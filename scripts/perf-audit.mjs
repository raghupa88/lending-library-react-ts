import puppeteer from 'puppeteer';
import { spawn } from 'child_process';

async function runAudit() {
    console.log('Starting Multi-Route Performance Audit using Chrome DevTools Protocol...');

    // Start the server
    const server = spawn('npm', ['run', 'preview'], { stdio: 'pipe', shell: true });

    let serverOutput = '';
    let serverReady = false;

    server.stdout.on('data', (data) => {
        const str = data.toString();
        serverOutput += str;
        if (str.includes('Local:') || str.includes('localhost')) {
            serverReady = true;
        }
    });

    // Wait for server to be ready
    console.log('Waiting for server to start...');
    for (let i = 0; i < 20; i++) {
        if (serverReady) break;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!serverReady) {
        console.log('Server output:', serverOutput);
        console.error('Server failed to start or was too slow.');
    }

    const browser = await puppeteer.launch({
        headless: false, // Keep headful as requested
        slowMo: 50,
        args: ['--no-sandbox']
    });

    try {
        const page = await browser.newPage();
        const client = await page.target().createCDPSession();
        await client.send('Performance.enable');

        const BASE_URL = 'http://localhost:4173';

        // Define routes to audit
        const routes = [
            { path: '/', name: 'Home' },
            { path: '/books', name: 'Books' },
            { path: '/login', name: 'Login' },
            // Dashboard requires auth, handled separately below
        ];

        let allPassed = true;

        // Helper to audit a page
        async function auditPage(path, name) {
            console.log(`\nAuditing ${name} (${path})...`);
            await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle0', timeout: 30000 });

            const metrics = await client.send('Performance.getMetrics');
            const getMetric = (n) => metrics.metrics.find(m => m.name === n)?.value || 0;

            const layoutCount = getMetric('LayoutCount');
            const jsHeapSize = getMetric('JSHeapUsedSize');
            const nodes = getMetric('Nodes');

            console.log(`  Layout Count: ${layoutCount}`);
            console.log(`  JS Heap Used: ${(jsHeapSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`  DOM Nodes: ${nodes}`);

            // Simple assertions
            if (layoutCount > 200) {
                console.error(`  ❌ FAIL: Layout count ${layoutCount} > 200`);
                allPassed = false;
            }
            if ((jsHeapSize / 1024 / 1024) > 100) {
                console.error(`  ❌ FAIL: Heap size > 100MB`);
                allPassed = false;
            }
        }

        // 1. Audit Public Routes
        for (const route of routes) {
            await auditPage(route.path, route.name);
        }

        // 2. Login
        console.log('\nLogging in...');
        await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
        await page.type('input[type="email"]', 'member@example.com');
        await page.type('input[type="password"]', 'password123');

        const submitBtn = await page.waitForSelector('button[type="submit"]');
        await Promise.all([
            page.waitForNavigation(),
            submitBtn.click(),
        ]);
        console.log('Login successful.');

        // 3. Audit Protected Route
        await auditPage('/dashboard', 'Dashboard');

        if (allPassed) {
            console.log('\n✅ All Routes Passed Performance Audit');
        } else {
            console.error('\n❌ Some Routes Failed Performance Audit');
            process.exitCode = 1;
        }

    } catch (error) {
        console.error('Audit failed:', error);
        process.exitCode = 1;
    } finally {
        await browser.close();

        if (process.platform === 'win32') {
            spawn("taskkill", ["/pid", server.pid, '/f', '/t']);
        } else {
            server.kill();
        }
        process.exit();
    }
}

runAudit();
