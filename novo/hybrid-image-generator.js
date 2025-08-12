// novo/hybrid-image-generator.js
const { AutoWhiskImageService, MockAutoWhiskImageService } = require('./whisk-image-service-auto');
const fs = require('fs-extra');
const path = require('path');
const clientFactory = require('./clientFactory');
const { uploadToDrive } = require('./utils');

const MOCK_APIS = process.env.MOCK_APIS === 'true' || true; // Usa a variável de ambiente ou define como true por padrão

class HybridImageGenerator {
    constructor(config = {}) {
        this.config = {
            preferWhisk: process.env.PREFER_WHISK !== 'false',
            forceImagen: process.env.FORCE_IMAGEN === 'true',
            imagenFallback: process.env.IMAGEN_FALLBACK !== 'false',
            ...config
        };
        this.stats = { whiskAttempts: 0, whiskSuccesses: 0, imagenFallbacks: 0, totalCost: 0 };
    }

    async generateImages(prompts, executionId, executionPath, driveFolderId, tempFileManager) {
        if (this.config.forceImagen) {
            console.log('[Hybrid] 🔧 Forçando o uso do Imagen 4...');
            return await this.generateWithImagen4(prompts, executionId, executionPath, driveFolderId, tempFileManager);
        }
        if (this.config.preferWhisk) {
            try {
                console.log('[Hybrid] 🚀 Tentando automação com Whisk...');
                return await this.generateWithWhisk(prompts, executionId, executionPath, driveFolderId, tempFileManager);
            } catch (error) {
                console.error(`[Hybrid] ❌ Falha no Whisk: ${error.message}`);
                if (this.config.imagenFallback) {
                    console.log('[Hybrid] 🔄 Ativando fallback para Imagen 4...');
                    return await this.generateWithImagen4(prompts, executionId, executionPath, driveFolderId, tempFileManager);
                }
                throw error;
            }
        }
        return await this.generateWithImagen4(prompts, executionId, executionPath, driveFolderId, tempFileManager);
    }

    async generateWithWhisk(prompts, executionId, executionPath, driveFolderId, tempFileManager) {
        if (MOCK_APIS) {
            console.log("[Hybrid] --- MODO MOCK ATIVADO (Whisk) ---");
            const mockImagePaths = [];
            const mockDriveUrls = [];
            const imageDir = path.join(executionPath, 'images');
            await fs.ensureDir(imageDir);

            for (let i = 0; i < prompts.length; i++) {
                const filePath = path.join(imageDir, `${executionId}_mock_image_whisk_${i + 1}.png`);
                // Cria um arquivo de imagem falso
                await fs.writeFile(filePath, Buffer.from('mock whisk image content'));
                tempFileManager.add(filePath);
                mockImagePaths.push(filePath);
                mockDriveUrls.push(`https://mock.drive.google.com/file/d/mock_image_whisk_${i + 1}`);
            }
            return { localPaths: mockImagePaths, driveUrls: mockDriveUrls };
        }

        this.stats.whiskAttempts++;
        const whiskService = MOCK_APIS ? new MockAutoWhiskImageService() : new AutoWhiskImageService();
        try {
            await whiskService.initialize();
            const downloadedPaths = await whiskService.generate(prompts);
            const result = await this.organizeAndUpload(downloadedPaths, executionId, executionPath, driveFolderId, tempFileManager);
            this.stats.whiskSuccesses++;
            return result;
        } finally {
            await whiskService.close();
        }
    }
    
    async generateWithImagen4(prompts, executionId, executionPath, driveFolderId, tempFileManager) {
        if (MOCK_APIS) {
            console.log("[Hybrid] --- MODO MOCK ATIVADO (Imagen 4) ---");
            const mockImagePaths = [];
            const mockDriveUrls = [];
            const imageDir = path.join(executionPath, 'images');
            await fs.ensureDir(imageDir);

            for (let i = 0; i < prompts.length; i++) {
                const filePath = path.join(imageDir, `${executionId}_mock_image_ia_${i + 1}.png`);
                // Cria um arquivo de imagem falso
                await fs.writeFile(filePath, Buffer.from('mock image content'));
                tempFileManager.add(filePath);
                mockImagePaths.push(filePath);
                mockDriveUrls.push(`https://mock.drive.google.com/file/d/mock_image_ia_${i + 1}`);
            }
            return { localPaths: mockImagePaths, driveUrls: mockDriveUrls };
        }

        this.stats.imagenFallbacks++;
        const cost = prompts.length * 0.04;
        this.stats.totalCost += cost;
        console.log(`[Hybrid] 💰 Usando Imagen 4. Custo estimado da etapa: ${cost.toFixed(2)}`);

        const vertexAiClient = clientFactory.getVertexAiClient();
        const imageDir = path.join(executionPath, 'images');
        await fs.ensureDir(imageDir);

        const imagePromises = prompts.map(async (promptData, i) => {
            try {
                const request = { 
                    endpoint: `projects/${process.env.PROJECT_ID}/locations/${process.env.LOCATION}/publishers/${process.env.PUBLISHER}/models/${process.env.MODEL}`,
                    instances: [clientFactory.helpers.toValue({ prompt: promptData.prompt })],
                    parameters: clientFactory.helpers.toValue({ sampleCount: 1 })
                };
                const [response] = await vertexAiClient.predict(request);
                const imageBase64 = response.predictions[0].structValue.fields.bytesBase64Encoded.stringValue;
                const filePath = path.join(imageDir, `${executionId}_image_ia_${i + 1}.png`);
                await fs.writeFile(filePath, Buffer.from(imageBase64, 'base64'));
                tempFileManager.add(filePath);
                const driveUrl = await uploadToDrive(filePath, driveFolderId);
                return { localPath: filePath, driveUrl };
            } catch (error) {
                if (error.message.includes('The response is blocked')) {
                    console.warn(`[Hybrid] ⚠️  A imagem ${i+1} (Imagen 4) foi bloqueada. Pulando...`);
                    return null;
                }
                throw error;
            }
        });

        const results = await Promise.all(imagePromises);
        const successfulResults = results.filter(r => r !== null);

        if (successfulResults.length === 0) { throw new Error("Nenhuma imagem pôde ser gerada com o fallback do Imagen 4."); }

        return {
            localPaths: successfulResults.map(r => r.localPath),
            driveUrls: successfulResults.map(r => r.driveUrl)
        };
    }

    async organizeAndUpload(imagePaths, executionId, executionPath, driveFolderId, tempFileManager) {
        const organizedPaths = [];
        const driveUrls = [];
        const imageDir = path.join(executionPath, 'images');
        await fs.ensureDir(imageDir);
        
        for (let i = 0; i < imagePaths.length; i++) {
            const oldPath = imagePaths[i];
            const newName = `${executionId}_image_whisk_${i + 1}.png`;
            const newPath = path.join(imageDir, newName);
            await fs.move(oldPath, newPath, { overwrite: true });
            tempFileManager.add(newPath);
            organizedPaths.push(newPath);
            const url = await uploadToDrive(newPath, driveFolderId);
            driveUrls.push(url);
        }
        return { localPaths: organizedPaths, driveUrls };
    }

    getStats() { return this.stats; }
}

module.exports = HybridImageGenerator;
