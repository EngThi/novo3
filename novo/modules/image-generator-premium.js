const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const CredentialManager = require('./credential-manager');

class ImageGeneratorPremium {
    constructor() {
        this.credentialManager = new CredentialManager();
        this.services = [
            {
                name: 'nano_banana',
                priority: 1,
                type: 'premium',
                endpoints: [
                    'https://api.fal.ai/fal-ai/nano-banana',
                    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent'
                ],
                quality: 'excellent',
                quota_limit: 1000 // Por dia
            },
            {
                name: 'huggingface_flux',
                priority: 2,
                type: 'free',
                endpoint: 'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
                quality: 'high',
                quota_limit: 100
            },
            {
                name: 'huggingface_sdxl',
                priority: 3,
                type: 'free', 
                endpoint: 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
                quality: 'good',
                quota_limit: 200
            },
            {
                name: 'pollinations',
                priority: 4,
                type: 'free',
                endpoint: 'https://image.pollinations.ai/prompt',
                quality: 'good',
                unlimited: true
            },
            {
                name: 'craiyon',
                priority: 5,
                type: 'free',
                endpoint: 'https://api.craiyon.com/v3',
                quality: 'medium',
                unlimited: true
            },
            {
                name: 'placeholder',
                priority: 999,
                type: 'fallback',
                quality: 'basic'
            }
        ];
    }

    async generateImages(prompts, outputDir, executionId) {
        const results = [];
        
        // Garantir que o diretório existe
        await fs.mkdir(outputDir, { recursive: true });
        
        for (let i = 0; i < prompts.length; i++) {
            const prompt = prompts[i];
            console.log(`🎨 Gerando imagem ${i+1}/${prompts.length}: "${prompt.prompt.substring(0, 50)}..."`);
            
            let imageGenerated = false;
            let lastError = null;
            
            // Tentar cada serviço em ordem de prioridade
            for (const service of this.services.sort((a, b) => a.priority - b.priority)) {
                if (service.type === 'fallback') continue;
                
                try {
                    console.log(`   🔄 Tentando ${service.name}...`);
                    
                    // Obter credencial para o serviço
                    let credential = null;
                    if (service.type === 'premium' || service.name.includes('huggingface')) {
                        try {
                            credential = await this.credentialManager.getNextCredential('image_generation');
                        } catch (credError) {
                            console.warn(`   ⚠️ Sem credenciais para ${service.name}: ${credError.message}`);
                            continue;
                        }
                    }
                    
                    const imagePath = await this.generateWithService(service, prompt, outputDir, `${executionId}_img_${i+1}`, credential);
                    
                    // Registrar sucesso
                    if (credential) {
                        await this.credentialManager.recordUsage(credential, 'image_generation', true);
                    }
                    
                    results.push({
                        path: imagePath,
                        prompt: prompt.prompt,
                        service: service.name,
                        quality: service.quality,
                        metadata: { index: i+1, executionId, generated_at: new Date().toISOString() }
                    });
                    
                    console.log(`   ✅ ${service.name}: ${path.basename(imagePath)}`);
                    imageGenerated = true;
                    break;
                    
                } catch (error) {
                    lastError = error;
                    console.warn(`   ❌ ${service.name} falhou: ${error.message}`);
                    
                    // Registrar falha se havia credencial
                    if (service.type === 'premium' || service.name.includes('huggingface')) {
                        try {
                            const credential = await this.credentialManager.getNextCredential('image_generation');
                            await this.credentialManager.recordFailure(credential, 'image_generation', error);
                        } catch (credError) {
                            // Ignorar erro de credencial aqui
                        }
                    }
                    
                    continue;
                }
            }
            
            // Se todos falharam, usar placeholder
            if (!imageGenerated) {
                console.log(`   🔄 Todos os serviços falharam, gerando placeholder...`);
                try {
                    const placeholderPath = await this.generatePlaceholder(prompt, outputDir, `${executionId}_placeholder_${i+1}`);
                    results.push({
                        path: placeholderPath,
                        prompt: prompt.prompt,
                        service: 'placeholder',
                        quality: 'basic',
                        metadata: { index: i+1, executionId, error: lastError?.message }
                    });
                    console.log(`   ✅ Placeholder gerado: ${path.basename(placeholderPath)}`);
                } catch (placeholderError) {
                    console.error(`   ❌ Falha crítica gerando placeholder: ${placeholderError.message}`);
                    throw new Error(`Não foi possível gerar imagem ${i+1}: ${lastError?.message || 'Erro desconhecido'}`);
                }
            }
            
            // Delay entre imagens para evitar rate limiting
            if (i < prompts.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        return results;
    }

    async generateWithService(service, prompt, outputDir, filename, credential = null) {
        const outputPath = path.join(outputDir, `${filename}.png`);
        
        switch (service.name) {
            case 'nano_banana':
                return await this.generateWithNanoBanana(service, prompt, outputPath, credential);
            case 'huggingface_flux':
            case 'huggingface_sdxl':
                return await this.generateWithHuggingFace(service, prompt, outputPath, credential);
            case 'pollinations':
                return await this.generateWithPollinations(service, prompt, outputPath);
            case 'craiyon':
                return await this.generateWithCraiyon(service, prompt, outputPath);
            default:
                throw new Error(`Serviço ${service.name} não implementado`);
        }
    }

    async generateWithNanoBanana(service, prompt, outputPath, credential) {
        if (!credential || !credential.api_key) {
            throw new Error('API key necessária para Nano Banana');
        }
        
        // Tentar endpoints diferentes do Nano Banana
        const endpoints = service.endpoints || [service.endpoint];
        let lastError = null;
        
        for (const endpoint of endpoints) {
            try {
                if (endpoint.includes('fal.ai')) {
                    // Usar Fal.ai API
                    const response = await axios.post(endpoint, {
                        prompt: prompt.prompt,
                        image_size: "1024x1024",
                        num_inference_steps: 4,
                        enable_safety_checker: true
                    }, {
                        headers: {
                            'Authorization': `Key ${credential.api_key}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 60000
                    });
                    
                    if (response.data && response.data.images && response.data.images[0]) {
                        const imageUrl = response.data.images[0].url;
                        await this.downloadImage(imageUrl, outputPath);
                        return outputPath;
                    }
                    
                } else if (endpoint.includes('generativelanguage.googleapis.com')) {
                    // Usar Google AI Studio (Gemini API)
                    const response = await axios.post(endpoint, {
                        contents: [{
                            parts: [{
                                text: `Generate an image: ${prompt.prompt}`
                            }]
                        }]
                    }, {
                        headers: {
                            'x-goog-api-key': credential.api_key,
                            'Content-Type': 'application/json'
                        },
                        timeout: 60000
                    });
                    
                    if (response.data && response.data.candidates && response.data.candidates[0]) {
                        const candidate = response.data.candidates[0];
                        if (candidate.content && candidate.content.parts) {
                            for (const part of candidate.content.parts) {
                                if (part.inlineData && part.inlineData.data) {
                                    await fs.writeFile(outputPath, Buffer.from(part.inlineData.data, 'base64'));
                                    return outputPath;
                                }
                            }
                        }
                    }
                }
                
                throw new Error('Resposta inválida do Nano Banana');
                
            } catch (error) {
                lastError = error;
                console.warn(`Endpoint ${endpoint} falhou: ${error.message}`);
                continue;
            }
        }
        
        throw lastError || new Error('Todos os endpoints do Nano Banana falharam');
    }

    async generateWithHuggingFace(service, prompt, outputPath, credential) {
        if (!credential || !credential.api_key) {
            throw new Error('API key necessária para Hugging Face');
        }
        
        try {
            const response = await axios.post(service.endpoint, {
                inputs: prompt.prompt,
                parameters: {
                    num_inference_steps: service.name.includes('flux') ? 4 : 20,
                    guidance_scale: 7.5,
                    width: 1024,
                    height: 1024
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${credential.api_key}`,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer',
                timeout: 120000
            });
            
            // Verificar se a resposta é uma imagem
            const contentType = response.headers['content-type'];
            if (contentType && contentType.startsWith('image/')) {
                await fs.writeFile(outputPath, response.data);
                return outputPath;
            } else {
                // Se retornou JSON (provavelmente erro), tentar parsear
                const textResponse = Buffer.from(response.data).toString();
                try {
                    const jsonResponse = JSON.parse(textResponse);
                    if (jsonResponse.error) {
                        throw new Error(`Hugging Face API Error: ${jsonResponse.error}`);
                    }
                } catch (parseError) {
                    // Se não conseguiu parsear, talvez seja o modelo ainda carregando
                    throw new Error('Modelo do Hugging Face ainda carregando, tente novamente em alguns segundos');
                }
                throw new Error('Resposta inválida do Hugging Face');
            }
            
        } catch (error) {
            if (error.response && error.response.status === 503) {
                throw new Error('Modelo do Hugging Face temporariamente indisponível');
            }
            throw error;
        }
    }

    async generateWithPollinations(service, prompt, outputPath) {
        const imageUrl = `${service.endpoint}/${encodeURIComponent(prompt.prompt)}?width=1024&height=1024&model=flux&enhance=true`;
        
        try {
            const response = await axios({
                method: 'get',
                url: imageUrl,
                responseType: 'stream',
                timeout: 30000,
                headers: {
                    'User-Agent': 'VideoAutomation/2.0 (GCP-Free)'
                }
            });
            
            const writer = require('fs').createWriteStream(outputPath);
            response.data.pipe(writer);
            
            return new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(outputPath));
                writer.on('error', reject);
            });
            
        } catch (error) {
            throw new Error(`Pollinations falhou: ${error.message}`);
        }
    }

    async generateWithCraiyon(service, prompt, outputPath) {
        try {
            const response = await axios.post(service.endpoint, {
                prompt: prompt.prompt,
                version: '35s5hfwn9n78gb06',
                token: null
            }, {
                timeout: 90000,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'VideoAutomation/2.0 (GCP-Free)'
                }
            });
            
            if (response.data && response.data.images && response.data.images[0]) {
                const imageBase64 = response.data.images[0];
                await fs.writeFile(outputPath, Buffer.from(imageBase64, 'base64'));
                return outputPath;
            }
            
            throw new Error('Resposta inválida da Craiyon API');
            
        } catch (error) {
            throw new Error(`Craiyon falhou: ${error.message}`);
        }
    }

    async downloadImage(url, outputPath) {
        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'stream',
            timeout: 30000
        });
        
        const writer = require('fs').createWriteStream(outputPath);
        response.data.pipe(writer);
        
        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    }

    async generatePlaceholder(prompt, outputDir, filename) {
        const outputPath = path.join(outputDir, `${filename}.png`);
        
        try {
            // Tentar ImageMagick primeiro
            const command = `convert -size 1024x768 xc:lightblue -pointsize 48 -fill black -gravity center -annotate +0+0 "${prompt.prompt.substring(0, 50)}..." "${outputPath}"`;
            await execPromise(command);
            return outputPath;
            
        } catch (error) {
            // Fallback: criar imagem simples com canvas
            try {
                const { createCanvas } = require('canvas');
                const canvas = createCanvas(1024, 768);
                const ctx = canvas.getContext('2d');
                
                // Fundo azul claro
                ctx.fillStyle = '#ADD8E6';
                ctx.fillRect(0, 0, 1024, 768);
                
                // Texto
                ctx.fillStyle = '#000000';
                ctx.font = '32px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Imagem Gerada Localmente', 512, 350);
                ctx.fillText(prompt.prompt.substring(0, 40), 512, 400);
                ctx.fillText('(Pipeline GCP-Free)', 512, 450);
                
                const buffer = canvas.toBuffer('image/png');
                await fs.writeFile(outputPath, buffer);
                return outputPath;
                
            } catch (canvasError) {
                // Último fallback: PNG mínimo
                const placeholderContent = this.createMinimalPNG();
                await fs.writeFile(outputPath, placeholderContent);
                return outputPath;
            }
        }
    }

    createMinimalPNG() {
        // PNG de 1024x768 azul claro em base64
        const base64PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        return Buffer.from(base64PNG, 'base64');
    }

    // Método para configurar APIs facilmente
    async setupAPIs() {
        console.log('🔧 Configurando APIs de geração de imagem...');
        
        // Adicionar APIs a partir de variáveis de ambiente
        if (process.env.NANO_BANANA_API_KEY) {
            await this.credentialManager.addImageGenerationAPI('Nano Banana (Fal.ai)', process.env.NANO_BANANA_API_KEY, {
                service_type: 'nano_banana',
                quota_limit: 1000,
                quota_reset_period: 'daily',
                rate_limit_ms: 3000
            });
            console.log('✅ Nano Banana API configurada');
        }
        
        if (process.env.HUGGINGFACE_API_KEY) {
            await this.credentialManager.addImageGenerationAPI('Hugging Face', process.env.HUGGINGFACE_API_KEY, {
                service_type: 'huggingface',
                quota_limit: 100,
                quota_reset_period: 'daily',
                rate_limit_ms: 2000
            });
            console.log('✅ Hugging Face API configurada');
        }
        
        // Adicionar múltiplas keys se disponíveis
        for (let i = 2; i <= 5; i++) {
            const keyVar = `NANO_BANANA_API_KEY_${i}`;
            if (process.env[keyVar]) {
                await this.credentialManager.addImageGenerationAPI(`Nano Banana ${i}`, process.env[keyVar], {
                    service_type: 'nano_banana',
                    quota_limit: 1000,
                    quota_reset_period: 'daily',
                    rate_limit_ms: 3000
                });
                console.log(`✅ Nano Banana API ${i} configurada`);
            }
        }
    }

    // Método para obter estatísticas
    async getStats() {
        return await this.credentialManager.getUsageStats('image_generation');
    }
}

module.exports = ImageGeneratorPremium;