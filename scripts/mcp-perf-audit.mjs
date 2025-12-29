import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import puppeteer from 'puppeteer';
import { spawn } from 'child_process';

async function runMCPAudit() {
    console.log('Starting Performance Audit using MCP (Model Context Protocol)...');

    // 1. Start the App Server
    const server = spawn('npm', ['run', 'preview'], { stdio: 'pipe', shell: true });
    let serverReady = false;
    server.stdout.on('data', (data) => {
        if (data.toString().includes('localhost')) serverReady = true;
    });

    console.log('Waiting for app server...');
    while (!serverReady) await new Promise(r => setTimeout(r, 500));

    // 2. Launch Chrome with Remote Debugging (Port 9222)
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--remote-debugging-port=9222', '--no-sandbox']
    });
    console.log('Chrome launched on port 9222');

    // 3. Start MCP Client & Server
    const transport = new StdioClientTransport({
        command: "npx",
        args: ["-y", "chrome-devtools-mcp@latest"]
    });

    const client = new Client({
        name: "perf-audit-client",
        version: "1.0.0",
    }, {
        capabilities: {}
    });

    try {
        await client.connect(transport);
        console.log('Connected to chrome-devtools-mcp server');

        // List tools to see what's available
        const tools = await client.listTools();
        console.log('Available tools:', tools.tools.map(t => t.name).join(', '));

        // Helper to call tool
        const call = async (name, args) => {
            console.log(`Calling tool: ${name} with args:`, args);
            const result = await client.callTool({ name, arguments: args });
            console.log(`Result from ${name}:`, JSON.stringify(result, null, 2));
            return result;
        };

        // 4. Run Audit
        const BASE_URL = 'http://localhost:4173';

        // Find the right tools
        const findTool = (pattern) => tools.tools.find(t =>
            t.name.includes(pattern) || t.name.toLowerCase().includes(pattern.toLowerCase())
        )?.name;

        const navTool = findTool('navigate');
        const metricsTool = findTool('metrics') || findTool('getMetrics');

        console.log(`\nUsing tools: navigate=${navTool}, metrics=${metricsTool}`);

        if (!navTool) {
            throw new Error(`Could not find navigation tool. Available: ${tools.tools.map(t => t.name).join(', ')}`);
        }

        // Navigate to Home
        console.log(`\nNavigating to ${BASE_URL}...`);
        await call(navTool, { url: BASE_URL });

        // Wait for load
        await new Promise(r => setTimeout(r, 3000));

        // Try to get metrics if available
        if (metricsTool) {
            const result = await call(metricsTool, {});

            // Parse result - MCP returns content array
            if (result.content && result.content.length > 0) {
                const content = result.content[0];
                console.log('\nMetrics content:', content);

                if (content.text) {
                    try {
                        const metricsData = JSON.parse(content.text);
                        const getMetric = (name) => {
                            if (metricsData.metrics) {
                                return metricsData.metrics.find(m => m.name === name)?.value || 0;
                            }
                            return 0;
                        };

                        const layoutCount = getMetric('LayoutCount');
                        const jsHeapSize = getMetric('JSHeapUsedSize');

                        console.log('\n--- MCP Metrics ---');
                        console.log(`Layout Count: ${layoutCount}`);
                        console.log(`JS Heap Used: ${(jsHeapSize / 1024 / 1024).toFixed(2)} MB`);

                        if (layoutCount > 200) {
                            console.error('❌ FAIL: Layout Count too high');
                            process.exitCode = 1;
                        } else {
                            console.log('✅ PASS');
                        }
                    } catch (e) {
                        console.error('Failed to parse metrics:', e);
                        console.log('Raw content:', content.text);
                    }
                }
            }
        } else {
            console.log('\n⚠️  No metrics tool found. MCP server may not expose Performance.getMetrics.');
            console.log('Available tools:', tools.tools.map(t => `${t.name}: ${t.description || 'no description'}`).join('\n'));
        }

    } catch (error) {
        console.error('MCP Audit failed:', error);
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

runMCPAudit();
