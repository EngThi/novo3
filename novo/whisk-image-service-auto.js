const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

class AutoWhiskImageService {
    constructor(options = {}) {
        this.extensionPath = path.resolve('./extensions/torio-tools');
        this.profilePath = path.resolve('./browser-profiles/whisk-automation');
        this.downloadPath = path.resolve('./downloads/whisk_downloads');
        // **CRITICAL**: The user must place the cookies file here.
        this.cookiesPath = path.join(this.profilePath, 'cookies.json'); 
        
        this.config = {
            headless: false, // Will be run inside Xvfb, so it's "headful" but not visible
            timeout: 300000,
            ...options
        };
        
        this.browser = null;
        this.page = null;
        this.isLoggedIn = false;
        this.xvfb = null;

        // Graceful shutdown handler
        ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => process.on(signal, () => {
            console.log(`[AutoWhisk] Received ${signal}. Closing processes...`);
            this.close();
            process.exit(0);
        }));
    }

    async initialize() {
        await this.startXvfb();
        await this.setupEnvironment();
        await this.launchChromeWithExtension();
        await this.navigateToWhisk();
        await this.ensureLogin(); // This will now check for cookies.json
        console.log('✅ Chrome automation initialized and session loaded successfully!');
    }

    async startXvfb() {
        console.log('🖥️  Starting virtual screen server (Xvfb)...');
        this.xvfb = spawn('Xvfb', [':99', '-screen', '0', '1920x1080x16', '-ac'], {
            detached: true,
            stdio: 'ignore'
        });
        // Give Xvfb a moment to start
        await new Promise(resolve => setTimeout(resolve, 1000)); 
    }

    async setupEnvironment() {
        await fs.ensureDir(this.profilePath);
        await fs.ensureDir(this.downloadPath);
        if (!await fs.pathExists(this.extensionPath)) {
            throw new Error(`TÓRIO TOOLS extension not found at ${this.extensionPath}`);
        }
    }

    async launchChromeWithExtension() {
        const puppeteer = require('puppeteer');
        console.log('🌐 Launching Chrome with extension in server mode...');
        this.browser = await puppeteer.launch({
            headless: this.config.headless,
            dumpio: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--display=:99', // Use the virtual screen
                `--user-data-dir=${this.profilePath}`,
                `--load-extension=${this.extensionPath}`,
                `--disable-extensions-except=${this.extensionPath}`,
            ],
            ignoreDefaultArgs: ['--disable-extensions']
        });
        console.log('✅ Chrome process launched successfully.');
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for extension to load
    }

    async navigateToWhisk() {
        this.page = await this.browser.newPage();
        await this.loadCookies(); // Critical step
        await this.page.goto('https://labs.google/fx/pt/tools/whisk', { waitUntil: 'networkidle2' });
    }

    async ensureLogin() {
        // This method no longer tries to log in. It just verifies the session.
        try {
            await this.page.waitForSelector('textarea[placeholder*="Descreva sua ideia"]', { timeout: 15000 });
            this.isLoggedIn = true;
            console.log('✅ Login verified (active session from cookies.json).');
        } catch (error) {
            console.error('❌ Login verification failed. The session from cookies.json might be invalid or expired.');
            throw new Error(`Could not verify login. Please ensure a valid 'cookies.json' file is placed in '${this.profilePath}'. You can generate it using a browser extension like 'Get cookies.txt LOCALLY' on your local machine after logging into Google Whisk, and then save the output as 'cookies.json'.`);
        }
    }

    async loadCookies() {
        try {
            if (await fs.pathExists(this.cookiesPath)) {
                const cookies = await fs.readJson(this.cookiesPath);
                if (cookies.length) {
                    await this.page.setCookie(...cookies);
                    console.log('🍪 Cookies loaded successfully from cookies.json.');
                } else {
                     throw new Error('cookies.json is empty.');
                }
            } else {
                throw new Error('cookies.json not found.');
            }
        } catch (e) {
            console.error(`Error loading cookies: ${e.message}`);
            throw new Error(`Failed to load or parse cookies from '${this.cookiesPath}'. Please ensure the file exists and is a valid JSON array.`);
        }
    }

    async generate(prompts) {
        if (!this.isLoggedIn) throw new Error('Not logged into Whisk.');
        
        // TODO: Implementar a lógica de interação com a API real do Whisk aqui.
        // Isso envolverá:
        // 1. Navegar para a página de geração de imagens do Whisk.
        // 2. Inserir os prompts nas caixas de texto apropriadas.
        // 3. Clicar no botão de geração.
        // 4. Monitorar o download das imagens geradas para this.downloadPath.
        // 5. Retornar os caminhos locais das imagens baixadas.
        console.log("[AutoWhisk] Placeholder para a lógica de geração de imagens do Whisk real.");
        console.log("Prompts a serem processados:", prompts);
        
        // Simulação temporária para evitar erros enquanto a lógica real não é implementada
        const mockDownloadedPaths = prompts.map((_, i) => path.join(this.downloadPath, `mock_real_whisk_image_${i + 1}.png`));
        for (const p of mockDownloadedPaths) {
            await fs.writeFile(p, Buffer.from('mock real whisk image content'));
        }
        return mockDownloadedPaths;

        // const downloadPromise = this.monitorDownloads(prompts.length);
        // const extensionId = await this.getExtensionId();
        // const popup = await this.browser.newPage();
        // await popup.goto(`chrome-extension://${extensionId}/popup.html`);
        // await popup.waitForSelector('#prompts');
        // await popup.evaluate((text) => {
        //     document.getElementById('prompts').value = text;
        //     document.getElementById('prompts').dispatchEvent(new Event('input'));
        // }, prompts.join('\n'));
        // await popup.click('#startButton');
        // console.log(`▶️ Automation started for ${prompts.length} images...`);
        // const downloadedFiles = await downloadPromise;
        // await popup.close();
        // return downloadedFiles;
    }

    async getExtensionId() {
        const targets = this.browser.targets();
        const extensionTarget = targets.find(target => target.type() === 'service_worker');
        if (!extensionTarget) throw new Error("Could not find the extension's service worker.");
        return extensionTarget.url().split('/')[2];
    }

    async monitorDownloads(expectedCount) {
        const chokidar = require('chokidar');
        return new Promise((resolve, reject) => {
            const downloadedFiles = [];
            const watcher = chokidar.watch(this.downloadPath, { ignoreInitial: true, persistent: true });
            const timeout = setTimeout(() => {
                watcher.close();
                if(downloadedFiles.length > 0) {
                    console.warn(`[WARN] Download timeout reached, but proceeding with ${downloadedFiles.length} downloaded images.`);
                    resolve(downloadedFiles);
                } else {
                    reject(new Error(`Timeout: No images were downloaded after ${this.config.timeout / 1000}s.`));
                }
            }, this.config.timeout);

            watcher.on('add', (filePath) => {
                if (path.extname(filePath) === '.png') {
                    downloadedFiles.push(filePath);
                    console.log(`📥 Image downloaded: ${path.basename(filePath)} (${downloadedFiles.length}/${expectedCount})`);
                    if (downloadedFiles.length >= expectedCount) {
                        clearTimeout(timeout);
                        watcher.close();
                        resolve(downloadedFiles);
                    }
                }
            });
        });
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('Browser closed.');
        }
        if (this.xvfb) {
            console.log('🖥️  Stopping virtual screen server (Xvfb)...');
            this.xvfb.kill();
        }
    }
}

class MockAutoWhiskImageService {
    constructor() {
        console.log("[MockWhisk] Initializing Mock AutoWhiskImageService");
    }

    async initialize() {
        console.log("[MockWhisk] Mock initialize called.");
        // Simula um pequeno atraso
        await new Promise(resolve => setTimeout(resolve, 100));
        this.isLoggedIn = true; // Simula login bem-sucedido
    }

    async generate(prompts) {
        console.log(`[MockWhisk] Mock generate called for ${prompts.length} prompts.`);
        const mockDownloadedPaths = prompts.map((_, i) => `/tmp/mock_whisk_image_${i + 1}.png`);
        // Simula a criação de arquivos mock
        for (const p of mockDownloadedPaths) {
            await fs.writeFile(p, Buffer.from('mock whisk image content'));
        }
        return mockDownloadedPaths;
    }

    async close() {
        console.log("[MockWhisk] Mock close called.");
        // Limpa arquivos mock criados
        // Note: Em um cenário real, tempFileManager cuidaria disso, mas aqui simulamos.
        // for (const p of mockDownloadedPaths) {
        //     try { await fs.unlink(p); } catch (e) { /* ignore */ }
        // }
    }
}

module.exports = { AutoWhiskImageService, MockAutoWhiskImageService };
