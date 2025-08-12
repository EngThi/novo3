// novo/whisk-image-service.js
const puppeteer = require('puppeteer');
const chokidar = require('chokidar');
const fs = require('fs-extra');
const path = require('path');

class WhiskImageService {
    constructor() {
        this.browser = null;
        this.page = null;
        this.downloadWatcher = null;
    }

    async launch() {
        console.log('[Whisk] Lançando navegador headless...');
        this.browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        console.log('[Whisk] Navegando para a ferramenta Whisk...');
        await this.page.goto('https://labs.google/fx/pt/tools/whisk', { waitUntil: 'networkidle2' });
        console.log('[Whisk] Página carregada com sucesso.');
    }

    async generate(prompt, downloadPath) {
        if (!this.page) {
            throw new Error("O navegador não foi iniciado. Chame launch() primeiro.");
        }
        
        await fs.ensureDir(downloadPath);

        // Configura o diretório de download para a sessão atual do Chrome
        const client = await this.page.target().createCDPSession();
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: downloadPath,
        });

        console.log(`[Whisk] Preparando para gerar imagem com o prompt: "${prompt.substring(0, 50)}..."`);
        
        // Espera o watcher estar pronto para capturar o download
        const downloadedImagePath = await this.watchForDownload(downloadPath);

        // Interage com a página
        await this.page.type('textarea', prompt);
        await this.page.click('button[aria-label="Gerar imagem"]');

        console.log('[Whisk] Prompt enviado. Aguardando a conclusão do download...');

        // Aguarda a promessa do watcher ser resolvida
        const finalPath = await downloadedImagePath;
        console.log(`[Whisk] ✅ Download concluído: ${path.basename(finalPath)}`);
        return finalPath;
    }

    watchForDownload(downloadPath) {
        return new Promise((resolve, reject) => {
            this.downloadWatcher = chokidar.watch(downloadPath, {
                ignored: /(^|[\/\\])\../, // ignora dotfiles
                persistent: true,
                ignoreInitial: true,
            });

            const timeout = setTimeout(() => {
                this.downloadWatcher.close();
                reject(new Error('Timeout de 5 minutos excedido para o download da imagem do Whisk.'));
            }, 300000); // 5 minutos

            this.downloadWatcher.on('add', (filePath) => {
                // Filtra arquivos temporários do Chrome
                if (filePath.endsWith('.crdownload')) {
                    return;
                }
                clearTimeout(timeout);
                this.downloadWatcher.close();
                resolve(filePath);
            });

            this.downloadWatcher.on('error', (error) => {
                clearTimeout(timeout);
                this.downloadWatcher.close();
                reject(error);
            });
        });
    }

    async close() {
        if (this.downloadWatcher) {
            await this.downloadWatcher.close();
        }
        if (this.browser) {
            console.log('[Whisk] Fechando navegador...');
            await this.browser.close();
        }
    }
}

module.exports = WhiskImageService;
