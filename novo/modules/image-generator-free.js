const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class ImageGeneratorFree {
    constructor() {
        this.services = [
            {
                name: 'craiyon',
                endpoint: 'https://api.craiyon.com/v3',
                free: true,
                unlimited: true
            },
            {
                name: 'pollinations',
                endpoint: 'https://image.pollinations.ai/prompt',
                free: true,
                unlimited: true,
                direct_url: true
            },
            {
                name: 'placeholder',
                fallback: true
            }
        ];
    }

    async generateImages(prompts, outputDir, executionId) {
        const results = [];
        
        for (let i = 0; i < prompts.length; i++) {
            const prompt = prompts[i];
            let imageGenerated = false;
            
            // Tentar cada serviço
            for (const service of this.services) {
                if (service.fallback) continue;
                
                try {
                    console.log(`Tentando gerar imagem ${i+1} com ${service.name}...`);
                    const imagePath = await this.generateWithService(service, prompt, outputDir, `${executionId}_img_${i+1}`);
                    
                    results.push({
                        path: imagePath,
                        prompt: prompt.prompt,
                        service: service.name,
                        metadata: { index: i+1, executionId }
                    });
                    
                    imageGenerated = true;
                    break;
                    
                } catch (error) {
                    console.warn(`${service.name} falhou para imagem ${i+1}:`, error.message);
                    continue;
                }
            }
            
            // Se nenhum serviço funcionou, usar placeholder
            if (!imageGenerated) {
                console.log(`Gerando placeholder para imagem ${i+1}...`);
                const placeholderPath = await this.generatePlaceholder(prompt, outputDir, `${executionId}_placeholder_${i+1}`);
                results.push({
                    path: placeholderPath,
                    prompt: prompt.prompt,
                    service: 'placeholder',
                    metadata: { index: i+1, executionId }
                });
            }
            
            // Pequeno delay para evitar rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        return results;
    }

    async generateWithService(service, prompt, outputDir, filename) {
        const outputPath = path.join(outputDir, `${filename}.png`);
        
        if (service.name === 'pollinations') {
            // Pollinations permite acesso direto via URL
            const imageUrl = `${service.endpoint}/${encodeURIComponent(prompt.prompt)}`;
            
            const response = await axios({
                method: 'get',
                url: imageUrl,
                responseType: 'stream',
                timeout: 30000
            });
            
            const writer = require('fs').createWriteStream(outputPath);
            response.data.pipe(writer);
            
            return new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(outputPath));
                writer.on('error', reject);
            });
            
        } else if (service.name === 'craiyon') {
            // Craiyon API (se disponível)
            try {
                const response = await axios.post('https://api.craiyon.com/v3', {
                    prompt: prompt.prompt,
                    version: '35s5hfwn9n78gb06'
                }, {
                    timeout: 60000,
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (compatible; VideoAutomation/1.0)'
                    }
                });
                
                if (response.data && response.data.images && response.data.images[0]) {
                    const imageBase64 = response.data.images[0];
                    await fs.writeFile(outputPath, Buffer.from(imageBase64, 'base64'));
                    return outputPath;
                }
                
                throw new Error('Resposta inválida da Craiyon API');
                
            } catch (error) {
                throw new Error(`Craiyon API falhou: ${error.message}`);
            }
        }
        
        throw new Error(`Serviço ${service.name} não implementado`);
    }

    async generatePlaceholder(prompt, outputDir, filename) {
        const outputPath = path.join(outputDir, `${filename}.png`);
        
        try {
            // Usar ImageMagick para criar placeholder se disponível
            const command = `convert -size 1024x768 xc:lightblue -pointsize 48 -fill black -gravity center -annotate +0+0 "${prompt.prompt.substring(0, 50)}..." "${outputPath}"`;
            await execPromise(command);
            return outputPath;
            
        } catch (error) {
            // Fallback: criar imagem simples com canvas (se node-canvas estiver disponível)
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
                
                const buffer = canvas.toBuffer('image/png');
                await fs.writeFile(outputPath, buffer);
                return outputPath;
                
            } catch (canvasError) {
                // Último fallback: copiar uma imagem placeholder estática
                const placeholderContent = await this.createMinimalPNG();
                await fs.writeFile(outputPath, placeholderContent);
                return outputPath;
            }
        }
    }

    async generatePlaceholders(prompts, outputDir, executionId) {
        const results = [];
        
        for (let i = 0; i < prompts.length; i++) {
            const placeholderPath = await this.generatePlaceholder(
                prompts[i], 
                outputDir, 
                `${executionId}_placeholder_${i+1}`
            );
            
            results.push({
                path: placeholderPath,
                prompt: prompts[i].prompt,
                service: 'placeholder',
                metadata: { index: i+1, executionId }
            });
        }
        
        return { localPaths: results.map(r => r.path), metadata: results };
    }

    // Criar um PNG mínimo de 1x1 pixel
    createMinimalPNG() {
        // PNG de 1x1 pixel transparente em base64
        const base64PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        return Buffer.from(base64PNG, 'base64');
    }
}

module.exports = ImageGeneratorFree;