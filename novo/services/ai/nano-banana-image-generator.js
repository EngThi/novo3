const axios = require('axios');
const fs = require('fs');
const path = require('path');

class NanoBananaImageGenerator {
    constructor(dependencies) {
        this.config = dependencies.config;
        this.logger = dependencies.logger;
        this.cache = dependencies.cache;
        
        // Múltiplas APIs Nano Banana com rotação
        this.nanoBananaKeys = [
            process.env.NANO_BANANA_API_KEY_1,
            process.env.NANO_BANANA_API_KEY_2,
            process.env.NANO_BANANA_API_KEY_3,
            process.env.NANO_BANANA_API_KEY_4,
            process.env.NANO_BANANA_API_KEY_5
        ].filter(key => key);
        
        this.currentKeyIndex = 0;
        this.maxRetries = 3;
        this.backoffMs = 2000;
        this.outputDir = '/home/user/main/novo3/novo/outputs/images';
        
        // Garantir pasta existe
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }
    
    async generateImageSequence(prompts, jobId) {
        const results = [];
        
        console.log(`🎨 Gerando ${prompts.length} imagens para job ${jobId}`);
        
        for (let i = 0; i < prompts.length; i++) {
            const prompt = prompts[i];
            
            try {
                const imageResult = await this.generateSingleImage({
                    prompt: prompt.prompt,
                    jobId: jobId,
                    sceneIndex: i + 1,
                    description: prompt.description
                });
                
                results.push({
                    scene: prompt.scene || i + 1,
                    description: prompt.description,
                    success: true,
                    ...imageResult
                });
                
                console.log(`✅ Imagem ${i + 1}/${prompts.length} gerada: ${imageResult.filename}`);
                
                // Pequeno delay entre imagens
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error(`❌ Erro na imagem ${i + 1}: ${error.message}`);
                
                results.push({
                    scene: prompt.scene || i + 1,
                    description: prompt.description,
                    success: false,
                    error: error.message
                });
            }
        }
        
        const successful = results.filter(r => r.success).length;
        console.log(`✅ Sequência completa: ${successful}/${prompts.length} imagens geradas`);
        
        return {
            total: prompts.length,
            successful,
            failed: prompts.length - successful,
            images: results,
            jobId
        };
    }
    
    async generateSingleImage(options) {
        const { prompt, jobId, sceneIndex, description } = options;
        
        let lastError = null;
        
        for (let retry = 0; retry < this.maxRetries; retry++) {
            for (let keyIndex = 0; keyIndex < this.nanoBananaKeys.length; keyIndex++) {
                try {
                    const apiKey = this.nanoBananaKeys[(this.currentKeyIndex + keyIndex) % this.nanoBananaKeys.length];
                    
                    if (!apiKey) continue;
                    
                    console.log(`🍌 Nano Banana - Scene ${sceneIndex} - API ${keyIndex + 1} - Retry ${retry + 1}`);
                    
                    const response = await axios.post(
                        'https://api.nanobanana.app/v1/generate',
                        {
                            prompt: prompt,
                            width: 1280,
                            height: 720,
                            steps: 20,
                            guidance_scale: 7.5,
                            model: "flux-schnell",
                            format: "jpeg",
                            quality: 85
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json'
                            },
                            timeout: 45000
                        }
                    );
                    
                    if (response.data && response.data.image_url) {
                        // Download da imagem
                        const filename = `${jobId}_scene${sceneIndex.toString().padStart(2, '0')}.jpg`;
                        const imagePath = path.join(this.outputDir, filename);
                        
                        const imageResponse = await axios.get(response.data.image_url, {
                            responseType: 'stream',
                            timeout: 30000
                        });
                        
                        const writer = fs.createWriteStream(imagePath);
                        imageResponse.data.pipe(writer);
                        
                        await new Promise((resolve, reject) => {
                            writer.on('finish', resolve);
                            writer.on('error', reject);
                        });
                        
                        const stats = fs.statSync(imagePath);
                        
                        console.log(`✅ Imagem salva: ${filename} (${Math.round(stats.size / 1024)}KB)`);
                        
                        // Rotacionar API para próxima chamada
                        this.currentKeyIndex = (this.currentKeyIndex + keyIndex + 1) % this.nanoBananaKeys.length;
                        
                        return {
                            filename,
                            imagePath,
                            imageUrl: `/images/${filename}`,
                            fileSize: stats.size,
                            fileSizeKB: Math.round(stats.size / 1024),
                            prompt: prompt.substring(0, 100) + '...',
                            apiUsed: keyIndex + 1,
                            retriesUsed: retry
                        };
                        
                    } else {
                        throw new Error('Resposta inválida da API Nano Banana');
                    }
                    
                } catch (error) {
                    lastError = error;
                    console.log(`❌ Nano Banana API ${keyIndex + 1} falhou: ${error.message}`);
                    
                    // Se for erro de quota/limite, pular para próxima API
                    if (error.response?.status === 429 || error.response?.status === 403) {
                        console.log(`🔄 Quota excedida, mudando para próxima API...`);
                        continue;
                    }
                    
                    // Rate limit específico
                    if (error.response?.status === 429) {
                        console.log(`⏱️ Rate limit, aguardando...`);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        continue;
                    }
                    
                    continue;
                }
            }
            
            // Todas as APIs falharam, backoff exponencial
            if (retry < this.maxRetries - 1) {
                const delay = this.backoffMs * Math.pow(2, retry);
                console.log(`⏱️ Backoff exponencial: ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw new Error(`Nano Banana: Todas as APIs falharam após ${this.maxRetries} tentativas. Último erro: ${lastError?.message}`);
    }
    
    async healthCheck() {
        return {
            status: 'healthy',
            service: 'Nano Banana Image Generator',
            features: {
                multipleAPIs: this.nanoBananaKeys.length,
                retrySystem: true,
                backoffExponential: true,
                formats: ['jpeg', 'png'],
                resolution: '1280x720',
                model: 'flux-schnell'
            },
            apis: {
                total: this.nanoBananaKeys.length,
                current: this.currentKeyIndex + 1,
                available: this.nanoBananaKeys.length > 0
            }
        };
    }
}

module.exports = NanoBananaImageGenerator;
