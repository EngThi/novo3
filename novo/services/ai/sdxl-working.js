const axios = require('axios');
const fs = require('fs');
const path = require('path');

class SDXLWorkingGenerator {
    constructor() {
        this.apiEndpoint = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0';
        this.token = process.env.HF_TOKEN || '';
        this.outputDir = '/home/user/main/novo3/novo/outputs/images';
        
        this.ensureOutputDir();
        
        console.log('🎨 SDXL Working Generator V6.3');
        console.log(`   🔑 Token: ${this.token ? 'Configurado' : 'Público'}`);
    }
    
    ensureOutputDir() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }
    
    async generateImage(prompt, options = {}) {
        const {
            jobId = `sdxl-${Date.now()}`,
            sceneIndex = 1
        } = options;
        
        try {
            console.log(`🎨 Gerando: "${prompt.substring(0, 50)}..."`);
            
            // Headers CORRETOS para SDXL
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'image/png'  // ← ESTA É A CORREÇÃO CRUCIAL!
            };
            
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
                console.log('   🔑 Usando token HF');
            }
            
            const payload = {
                inputs: prompt,
                parameters: {
                    num_inference_steps: 20
                }
            };
            
            const startTime = Date.now();
            
            const response = await axios.post(
                this.apiEndpoint,
                payload,
                {
                    headers: headers,
                    responseType: 'arraybuffer',
                    timeout: 120000 // 2 minutos
                }
            );
            
            const responseTime = Date.now() - startTime;
            
            if (response.data && response.data.byteLength > 1000) {
                const filename = `${jobId}_sdxl_${sceneIndex}.png`;
                const imagePath = path.join(this.outputDir, filename);
                
                fs.writeFileSync(imagePath, Buffer.from(response.data));
                
                const stats = fs.statSync(imagePath);
                const sizeKB = Math.round(stats.size / 1024);
                
                console.log(`   ✅ Sucesso: ${filename} (${sizeKB}KB, ${responseTime}ms)`);
                
                return {
                    success: true,
                    filename,
                    imagePath,
                    imageUrl: `/images/${filename}`,
                    provider: 'sdxl-working',
                    size: `${sizeKB}KB`,
                    responseTime: `${responseTime}ms`
                };
            }
            
            throw new Error('Resposta inválida');
            
        } catch (error) {
            const errorMsg = this.parseError(error);
            console.log(`   ❌ Erro: ${errorMsg.substring(0, 100)}...`);
            
            // Verificar se modelo está carregando
            if (errorMsg.includes('loading') || errorMsg.includes('estimated_time')) {
                const waitTime = this.extractWaitTime(errorMsg) || 25;
                console.log(`   ⏳ Modelo carregando... aguardando ${waitTime}s`);
                
                await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
                
                // Tentar uma vez mais
                console.log(`   🔄 Tentando novamente...`);
                return this.generateImage(prompt, { ...options, _retry: true });
            }
            
            throw new Error(`SDXL: ${errorMsg}`);
        }
    }
    
    parseError(error) {
        try {
            if (error.response?.data) {
                const errorText = Buffer.from(error.response.data).toString();
                try {
                    const errorJson = JSON.parse(errorText);
                    return errorJson.error || errorText;
                } catch (e) {
                    return errorText;
                }
            }
            return error.message;
        } catch (e) {
            return 'Erro desconhecido';
        }
    }
    
    extractWaitTime(errorMsg) {
        const match = errorMsg.match(/estimated_time[":]+\s*(\d+\.?\d*)/);
        return match ? Math.ceil(parseFloat(match[1])) : null;
    }
    
    async testConnection() {
        console.log('🧪 Testando SDXL...');
        
        try {
            const result = await this.generateImage(
                'A beautiful mountain landscape, professional photography',
                { jobId: 'test-connection', sceneIndex: 1 }
            );
            
            if (result.success) {
                console.log('✅ SDXL funcionando!');
                return {
                    status: 'healthy',
                    testImage: result.filename,
                    responseTime: result.responseTime
                };
            }
            
        } catch (error) {
            console.log(`❌ Teste falhou: ${error.message}`);
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }
    
    async generateBatch(prompts, jobId = `batch-${Date.now()}`) {
        console.log(`🎨 Gerando lote: ${prompts.length} imagens`);
        
        const results = [];
        
        for (let i = 0; i < prompts.length; i++) {
            try {
                console.log(`📸 Imagem ${i + 1}/${prompts.length}`);
                
                const result = await this.generateImage(prompts[i], {
                    jobId,
                    sceneIndex: i + 1
                });
                
                if (result.success) {
                    results.push(result);
                }
                
                // Delay entre imagens para evitar rate limit
                if (i < prompts.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
            } catch (error) {
                console.log(`❌ Falha na imagem ${i + 1}: ${error.message}`);
            }
        }
        
        console.log(`✅ Lote concluído: ${results.length}/${prompts.length} sucessos`);
        
        return {
            success: results.length > 0,
            images: results,
            totalGenerated: results.length,
            totalRequested: prompts.length
        };
    }
}

module.exports = SDXLWorkingGenerator;
