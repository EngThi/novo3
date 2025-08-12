// novo/utils.js
const fs = require('fs').promises;
const fssync = require('fs');
const path = require('path');
const clientFactory = require('./clientFactory'); // Precisamos para o getDriveClient

// --- FUNÇÕES MOVIDAS DO pipeline.js ---
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === '.mp3') return 'audio/mpeg';
    if (ext === '.mp4') return 'video/mp4';
    return 'application/octet-stream';
}

async function uploadToDrive(filePath, folderId) {
    const drive = clientFactory.getDriveClient();
    const file = await drive.files.create({
        resource: { name: path.basename(filePath), parents: [folderId] },
        media: { mimeType: getMimeType(filePath), body: fssync.createReadStream(filePath) },
        fields: 'id, webViewLink',
    });
    await drive.permissions.create({ fileId: file.data.id, requestBody: { role: 'reader', type: 'anyone' } });
    return file.data.webViewLink;
}

// --- CLASSES DE OTIMIZAÇÃO (EXISTENTES) ---
class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
    }
    startTimer(label) {
        this.metrics.set(label, process.hrtime());
        console.log(`⏱️  [${label}] Iniciado...`);
    }
    endTimer(label) {
        const startTime = this.metrics.get(label);
        if (startTime) {
            const diff = process.hrtime(startTime);
            const duration = diff[0] * 1000 + diff[1] * 1e-6;
            console.log(`✅ [${label}] Concluído em ${duration.toFixed(2)}ms`);
            return duration;
        }
    }
    trackMemory(label) {
        const used = process.memoryUsage();
        console.log(`📊 [${label}] Memória Heap: ${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`);
    }
}

class TempFileManager {
    constructor() {
        this.tempFiles = new Set();
        this._bindExitHandler();
    }
    add(filePath) {
        this.tempFiles.add(filePath);
    }
    _bindExitHandler() {
        process.on('exit', () => this.cleanup());
        process.on('SIGINT', () => { this.cleanup().then(() => process.exit()); });
        process.on('uncaughtException', (err) => {
            console.error("Exceção não tratada!", err);
            this.cleanup().then(() => process.exit(1));
        });
    }
    async cleanup() {
        console.log(`🧹 Limpando ${this.tempFiles.size} arquivos temporários...`);
        for (const filePath of this.tempFiles) {
            try {
                await fs.unlink(filePath);
                console.log(`🗑️  Arquivo ${filePath} deletado.`);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    console.warn(`⚠️  Falha ao limpar arquivo temporário: ${filePath}`, error.message);
                }
            }
        }
        this.tempFiles.clear();
    }
}

module.exports = {
    PerformanceMonitor,
    TempFileManager,
    getMimeType,
    uploadToDrive,
};
