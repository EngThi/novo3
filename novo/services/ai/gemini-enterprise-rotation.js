const axios = require('axios');
const fs = require('fs');
const path = require('path');

class GeminiEnterpriseRotation {
    constructor(dependencies) {
        this.logger = dependencies.logger || console;
        
        // CARREGAR TODAS AS CHAVES DO .ENV
        this.loadAPIKeys();
        
        this.textModel = process.env.TEXT_MODEL_PRIMARY || 'gemini-2.5-flash';
        this.imageOutputDir = process.env.IMAGE_PATH || '/home/user/main/novo3/novo/outputs/images';
        
        // CONFIGURAÇÕES DE ROTAÇÃO
        this.maxRetries = parseInt(process.env.MAX_RETRIES_PER_PROVIDER) || 3;
        this.apiCooldown = parseInt(process.env.API_COOLDOWN_SECONDS) * 1000 || 30000;
        this.quotaResetWait = parseInt(process.env.QUOTA_RESET_WAIT_SECONDS) * 1000 || 60000;
        
        // TRACKING DE USAGE
        this.apiUsage = new Map();
        this.lastErrors = new Map();
        this.quotaResetTimes = new Map();
        
        this.ensureDirectories();
        this.initializeProviders();
        
        console.log('🚀 Gemini Enterprise Rotation V6.0 - Sistema Completo');
        console.log(`   🧠 Texto: ${this.textModel}`);
        console.log(`   🔑 Gemini Keys: ${this.geminiKeys.length}`);
        console.log(`   🎨 Image Providers: ${this.imageProviders.length}`);
        console.log(`   ⚡ Rotação automática: ATIVA`);
    }
    
    loadAPIKeys() {
        // GEMINI KEYS (até 20)
        this.geminiKeys = [];
        for (let i = 1; i <= 20; i++) {
            const key = process.env[`GEMINI_API_KEY${i === 1 ? '' : '_' + i}`];
            if (key && key.length > 20) {
                this.geminiKeys.push(key);
            }
        }
        
        // TOGETHER AI KEYS
        this.togetherKeys = [];
        for (let i = 1; i <= 5; i++) {
            const key = process.env[`TOGETHER_API_KEY${i === 1 ? '' : '_' + i}`];
            if (key && key.length > 10) {
                this.togetherKeys.push(key);
            }
        }
        
        // HUGGING FACE TOKENS
        this.hfTokens = [];
        for (let i = 1; i <= 5; i++) {
            const token = process.env[`HF_TOKEN${i === 1 ? '' : '_' + i}`];
            if (token && token.length > 10) {
                this.hfTokens.push(token);
            }
        }
        
        // REPLICATE TOKENS
        this.replicateTokens = [];
        for (let i = 1; i <= 3; i++) {
            const token = process.env[`REPLICATE_API_TOKEN${i === 1 ? '' : '_' + i}`];
            if (token && token.length > 10) {
                this.replicateTokens.push(token);
            }
        }
        
        // STABILITY AI KEYS
        this.stabilityKeys = [];
        for (let i = 1; i <= 3; i++) {
            const key = process.env[`STABILITY_API_KEY${i === 1 ? '' : '_' + i}`];
            if (key && key.length > 10) {
                this.stabilityKeys.push(key);
            }
        }
        
        // LEONARDO AI KEYS
        this.leonardoKeys = [];
        for (let i = 1; i <= 3; i++) {
            const key = process.env[`LEONARDO_API_KEY${i === 1 ? '' : '_' + i}`];
            if (key && key.length > 10) {
                this.leonardoKeys.push(key);
            }
        }
        
        // OPENAI KEYS
        this.openaiKeys = [];
        for (let i = 1; i <= 3; i++) {
            const key = process.env[`OPENAI_API_KEY${i === 1 ? '' : '_' + i}`];
            if (key && key.length > 10) {
                this.openaiKeys.push(key);
            }
        }
        
        console.log(`🔑 APIs carregadas: Gemini(${this.geminiKeys.length}), Together(${this.togetherKeys.length}), HF(${this.hfTokens.length}), Replicate(${this.replicateTokens.length}), Stability(${this.stabilityKeys.length}), Leonardo(${this.leonardoKeys.length}), OpenAI(${this.openaiKeys.length})`);
    }
    
    initializeProviders() {
        this.imageProviders = [
            {
                name: 'Nano Banana',
                type: 'gemini',
                priority: parseInt(process.env.IMAGE_PROVIDER_PRIORITY_1) || 1,
                keys: this.geminiKeys,
                model: 'gemini-2.5-flash-image-preview',
                quality: 'premium',
                enabled: this.geminiKeys.length > 0
            },
            {
                name: 'Together AI',
                type: 'together',
                priority: parseInt(process.env.IMAGE_PROVIDER_PRIORITY_2) || 2,
                keys: this.togetherKeys,
                model: process.env.TOGETHER_MODEL_PRIMARY || 'black-forest-labs/FLUX.1-schnell-Free',
                quality: 'high',
                enabled: this.togetherKeys.length > 0 || process.env.TOGETHER_API_KEY
            },
            {
                name: 'Pollinations',
                type: 'pollinations',
                priority: parseInt(process.env.IMAGE_PROVIDER_PRIORITY_3) || 3,
                keys: ['no-key-needed'],
                quality: 'good',
                enabled: true, // Sempre disponível
                unlimited: true
            },
            {
                name: 'Hugging Face',
                type: 'huggingface',
                priority: parseInt(process.env.IMAGE_PROVIDER_PRIORITY_4) || 4,
                keys: this.hfTokens.length > 0 ? this.hfTokens : ['no-token'],
                model: process.env.HF_MODEL_PRIMARY || 'black-forest-labs/FLUX.1-dev',
                quality: 'good',
                enabled: true // Funciona sem token também
            },
            {
                name: 'Replicate',
                type: 'replicate',
                priority: parseInt(process.env.IMAGE_PROVIDER_PRIORITY_5) || 5,
                keys: this.replicateTokens,
                model: process.env.REPLICATE_MODEL_PRIMARY || 'black-forest-labs/flux-schnell',
                quality: 'high',
                enabled: this.replicateTokens.length > 0
            },
            {
                name: 'Stability AI',
                type: 'stability',
                priority: parseInt(process.env.IMAGE_PROVIDER_PRIORITY_6) || 6,
                keys: this.stabilityKeys,
                model: process.env.STABILITY_MODEL || 'stable-diffusion-xl-1024-v1-0',
                quality: 'high',
                enabled: this.stabilityKeys.length > 0
            },
            {
                name: 'Leonardo AI',
                type: 'leonardo',
                priority: parseInt(process.env.IMAGE_PROVIDER_PRIORITY_7) || 7,
                keys: this.leonardoKeys,
                quality: 'high',
                enabled: this.leonardoKeys.length > 0
            },
            {
                name: 'OpenAI DALL-E',
                type: 'openai',
                priority: parseInt(process.env.IMAGE_PROVIDER_PRIORITY_8) || 8,
                keys: this.openaiKeys,
                model: process.env.OPENAI_MODEL || 'dall-e-3',
                quality: 'premium',
                enabled: this.openaiKeys.length > 0
            }
        ];
        
        // Filtrar apenas providers habilitados e ordenar por prioridade
        this.imageProviders = this.imageProviders
            .filter(p => p.enabled)
            .sort((a, b) => a.priority - b.priority);
    }
    
    ensureDirectories() {
        if (!fs.existsSync(this.imageOutputDir)) {
            fs.mkdirSync(this.imageOutputDir, { recursive: true });
        }
    }
    
    async generateScript(params) {
        const { topic, style } = params;
        
        const currentDate = new Date().toLocaleDateString('pt-BR');
        const currentTime = new Date().toLocaleTimeString('pt-BR');
        
        const prompt = `🚀 PIPELINE ULTIMATE V6.0 - GEMINI 2.5 FLASH ENTERPRISE

TÓPICO: "${topic}"
DATA: ${currentDate} às ${currentTime}
ESTILO: ${style}

IMPORTANTE: No INÍCIO do roteiro, mencione a data das notícias (${currentDate}).

Crie roteiro profissional para YouTube com informações atuais de hoje.

ESTRUTURA ENTERPRISE:
1. ABERTURA: Data + gancho magnético
2. CONTEÚDO: 4-6 pontos principais detalhados
3. CALL TO ACTION: Específico e convincente

Responda APENAS JSON válido:
{
  "title": "Título SEO otimizado com data e palavras-chave",
  "content": "Roteiro completo, envolvente e profissional",
  "hook": "Abertura magnética com data + impacto", 
  "keyPoints": ["ponto1", "ponto2", "ponto3", "ponto4"],
  "duration": "180",
  "seoKeywords": ["palavra1", "palavra2", "atual", "trending"],
  "callToAction": "CTA específico, motivador e direcionado"
}`;

        return this.callGeminiTextAPIWithRotation(prompt, 'script-generation');
    }
    
    async generateSingleImage(prompt, jobId, sceneIndex) {
        console.log(`🎨 Gerando Imagem ${sceneIndex}: Testando ${this.imageProviders.length} providers...`);
        
        for (const provider of this.imageProviders) {
            try {
                console.log(`🔄 ${provider.name} (Prioridade ${provider.priority}, Qualidade: ${provider.quality})...`);
                
                // Verificar se provider está em cooldown
                if (this.isProviderInCooldown(provider.name)) {
                    console.log(`⏰ ${provider.name}: Em cooldown, pulando...`);
                    continue;
                }
                
                const result = await this.generateImageWithProvider(provider, prompt, jobId, sceneIndex);
                
                if (result.success) {
                    console.log(`✅ ${provider.name}: Sucesso! (${result.provider})`);
                    this.recordProviderSuccess(provider.name);
                    return result;
                }
                
            } catch (error) {
                const errorMsg = error.message || 'Erro desconhecido';
                console.log(`❌ ${provider.name}: ${errorMsg.substring(0, 80)}...`);
                
                this.recordProviderError(provider.name, error);
                
                // Se for quota excedida, colocar em cooldown
                if (errorMsg.includes('quota') || errorMsg.includes('limit') || errorMsg.includes('exceeded')) {
                    this.setProviderCooldown(provider.name);
                    console.log(`🕐 ${provider.name}: Quota excedida, cooldown ativado`);
                }
                
                continue;
            }
        }
        
        throw new Error(`Todos os ${this.imageProviders.length} provedores de imagem falharam`);
    }
    
    async generateImageWithProvider(provider, prompt, jobId, sceneIndex) {
        const method = `generate${provider.type.charAt(0).toUpperCase() + provider.type.slice(1)}`;
        
        if (typeof this[method] === 'function') {
            return await this[method](provider, prompt, jobId, sceneIndex);
        } else {
            throw new Error(`Método ${method} não implementado`);
        }
    }
    
    async generateGemini(provider, prompt, jobId, sceneIndex) {
        const imagePrompt = `Generate high-quality professional image: ${prompt}

REQUIREMENTS:
- Resolution: 1280x720 (16:9)
- Professional quality  
- Consistent visual style
- Rich details
- Modern aesthetic`;

        return this.callGeminiAPIWithRotation(
            imagePrompt,
            provider.model,
            'nano-banana-generation',
            provider.keys,
            { responseModalities: ['Image'] }
        ).then(result => {
            if (result.success && result.imageData) {
                return this.saveImageFromBase64(result.imageData, jobId, sceneIndex, 'nano-banana');
            }
            throw new Error('Nano Banana: Resposta sem imagem');
        });
    }
    
    async generateTogether(provider, prompt, jobId, sceneIndex) {
        const keys = provider.keys.length > 0 ? provider.keys : [process.env.TOGETHER_API_KEY].filter(Boolean);
        
        return this.callAPIWithRotation(keys, async (apiKey) => {
            const response = await axios.post('https://api.together.xyz/v1/images/generations', {
                model: provider.model,
                prompt: `Professional high-quality image: ${prompt}. 16:9 aspect ratio, detailed, photorealistic, modern style`,
                width: parseInt(process.env.TOGETHER_WIDTH) || 1280,
                height: parseInt(process.env.TOGETHER_HEIGHT) || 720,
                steps: parseInt(process.env.TOGETHER_STEPS) || 4,
                n: 1,
                response_format: 'url'
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: parseInt(process.env.TOGETHER_TIMEOUT) || 30000
            });
            
            const imageUrl = response.data.data[0].url;
            return this.saveImageFromURL(imageUrl, jobId, sceneIndex, 'together-flux');
        });
    }
    
    async generatePollinations(provider, prompt, jobId, sceneIndex) {
        const enhancedPrompt = `Professional high quality image: ${prompt}. 16:9 aspect ratio, detailed photography, 8k resolution, cinematic lighting, sharp focus, modern aesthetic`;
        
        const encodedPrompt = encodeURIComponent(enhancedPrompt);
        const seed = Date.now() + Math.random() * 1000;
        
        const model = process.env.POLLINATIONS_MODEL || 'flux';
        const imageUrl = `${process.env.POLLINATIONS_ENDPOINT || 'https://pollinations.ai/p/'}${encodedPrompt}?width=1280&height=720&seed=${Math.floor(seed)}&model=${model}`;
        
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 25000,
            headers: {
                'User-Agent': 'Pipeline-Ultimate-V6-Enterprise'
            }
        });
        
        if (response.data && response.data.byteLength > 5000) {
            return this.saveImageFromBuffer(Buffer.from(response.data), jobId, sceneIndex, 'pollinations');
        }
        
        throw new Error('Pollinations: Imagem inválida ou muito pequena');
    }
    
    async generateHuggingface(provider, prompt, jobId, sceneIndex) {
        const tokens = provider.keys.filter(k => k !== 'no-token');
        
        if (tokens.length > 0) {
            // Usar token se disponível
            return this.callAPIWithRotation(tokens, async (token) => {
                return this.callHuggingFaceAPI(token, provider, prompt, jobId, sceneIndex);
            });
        } else {
            // Usar sem token (tier gratuito com fila)
            return this.callHuggingFaceAPI(null, provider, prompt, jobId, sceneIndex);
        }
    }
    
    async callHuggingFaceAPI(token, provider, prompt, jobId, sceneIndex) {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await axios.post(
            `https://api-inference.huggingface.co/models/${provider.model}`,
            {
                inputs: `Professional high quality image: ${prompt}. 16:9 aspect ratio, detailed, photorealistic`,
                parameters: {
                    width: parseInt(process.env.HF_WIDTH) || 1280,
                    height: parseInt(process.env.HF_HEIGHT) || 720,
                    num_inference_steps: parseInt(process.env.HF_NUM_INFERENCE_STEPS) || 25,
                    guidance_scale: parseFloat(process.env.HF_GUIDANCE_SCALE) || 7.5
                }
            },
            {
                headers,
                responseType: 'arraybuffer',
                timeout: parseInt(process.env.HF_TIMEOUT) || 60000
            }
        );
        
        if (response.data && response.data.byteLength > 5000) {
            return this.saveImageFromBuffer(Buffer.from(response.data), jobId, sceneIndex, 'huggingface');
        }
        
        throw new Error('Hugging Face: Resposta inválida ou em fila');
    }
    
    // [Continuação com outros providers...]
    // generateReplicate, generateStability, generateLeonardo, generateOpenai
    
    async callGeminiTextAPIWithRotation(prompt, operation) {
        return this.callAPIWithRotation(this.geminiKeys, async (apiKey) => {
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${this.textModel}:generateContent?key=${apiKey}`,
                {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: parseFloat(process.env.TEXT_TEMPERATURE) || 0.8,
                        topK: parseInt(process.env.TEXT_TOP_K) || 40,
                        topP: parseFloat(process.env.TEXT_TOP_P) || 0.95,
                        maxOutputTokens: parseInt(process.env.TEXT_MAX_OUTPUT_TOKENS) || 3000
                    }
                },
                { timeout: 35000 }
            );
            
            const parts = response.data.candidates[0].content.parts;
            const textPart = parts.find(part => part.text);
            
            if (textPart) {
                const content = textPart.text;
                const jsonResult = this.parseJsonResponse(content);
                
                console.log(`✅ ${this.textModel}: Script gerado! Qualidade: ${this.calculateQualityScore(jsonResult)}/10`);
                
                return {
                    success: true,
                    data: jsonResult,
                    model: this.textModel
                };
            }
            
            throw new Error('Resposta sem texto válido');
        });
    }
    
    async callGeminiAPIWithRotation(prompt, model, operation, keys, options = {}) {
        return this.callAPIWithRotation(keys, async (apiKey) => {
            const requestConfig = {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                    ...options.responseModalities && { responseModalities: options.responseModalities }
                }
            };
            
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                requestConfig,
                { timeout: 45000 }
            );
            
            const parts = response.data.candidates[0].content.parts;
            const imagePart = parts.find(part => part.inlineData);
            
            if (imagePart) {
                return {
                    success: true,
                    imageData: imagePart.inlineData.data
                };
            }
            
            throw new Error('Resposta sem imagem');
        });
    }
    
    async callAPIWithRotation(keys, apiCall) {
        let lastError = null;
        
        for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
            try {
                const result = await apiCall(keys[keyIndex]);
                return result;
            } catch (error) {
                lastError = error;
                
                const errorMsg = error.response?.data?.error?.message || error.message;
                
                // Se for quota, pular para próxima chave
                if (errorMsg.includes('quota') || errorMsg.includes('limit') || errorMsg.includes('exceeded')) {
                    console.log(`🔄 Key ${keyIndex + 1}: Quota excedida, próxima chave...`);
                    continue;
                }
                
                // Rate limit - aguardar um pouco
                if (error.response?.status === 429) {
                    console.log(`⏱️ Key ${keyIndex + 1}: Rate limit, aguardando...`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    continue;
                }
                
                continue;
            }
        }
        
        throw lastError || new Error('Todas as chaves falharam');
    }
    
    // Métodos de cooldown e tracking
    isProviderInCooldown(providerName) {
        const cooldownUntil = this.quotaResetTimes.get(providerName);
        return cooldownUntil && Date.now() < cooldownUntil;
    }
    
    setProviderCooldown(providerName) {
        const cooldownUntil = Date.now() + this.quotaResetWait;
        this.quotaResetTimes.set(providerName, cooldownUntil);
    }
    
    recordProviderSuccess(providerName) {
        // Remover cooldown se sucesso
        this.quotaResetTimes.delete(providerName);
        
        // Atualizar estatísticas
        const stats = this.apiUsage.get(providerName) || { success: 0, errors: 0 };
        stats.success++;
        this.apiUsage.set(providerName, stats);
    }
    
    recordProviderError(providerName, error) {
        const stats = this.apiUsage.get(providerName) || { success: 0, errors: 0 };
        stats.errors++;
        this.apiUsage.set(providerName, stats);
        
        this.lastErrors.set(providerName, {
            error: error.message,
            timestamp: Date.now()
        });
    }
    
    // Métodos auxiliares para salvar imagens
    saveImageFromBase64(base64Data, jobId, sceneIndex, provider) {
        const filename = `${jobId}_scene${sceneIndex.toString().padStart(2, '0')}_${provider}.png`;
        const imagePath = path.join(this.imageOutputDir, filename);
        
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(imagePath, buffer);
        
        const stats = fs.statSync(imagePath);
        
        return {
            filename,
            imagePath,
            imageUrl: `/images/${filename}`,
            fileSize: stats.size,
            fileSizeKB: Math.round(stats.size / 1024),
            provider: provider,
            success: true
        };
    }
    
    saveImageFromURL(imageUrl, jobId, sceneIndex, provider) {
        return axios.get(imageUrl, { responseType: 'arraybuffer' })
            .then(response => {
                return this.saveImageFromBuffer(Buffer.from(response.data), jobId, sceneIndex, provider);
            });
    }
    
    saveImageFromBuffer(buffer, jobId, sceneIndex, provider) {
        const filename = `${jobId}_scene${sceneIndex.toString().padStart(2, '0')}_${provider}.png`;
        const imagePath = path.join(this.imageOutputDir, filename);
        
        fs.writeFileSync(imagePath, buffer);
        const stats = fs.statSync(imagePath);
        
        return {
            filename,
            imagePath,
            imageUrl: `/images/${filename}`,
            fileSize: stats.size,
            fileSizeKB: Math.round(stats.size / 1024),
            provider: provider,
            success: true
        };
    }
    
    parseJsonResponse(content) {
        try {
            return JSON.parse(content);
        } catch (e) {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    return JSON.parse(jsonMatch[0]);
                } catch (e2) {
                    return this.createFallbackJson(content);
                }
            }
            return this.createFallbackJson(content);
        }
    }
    
    createFallbackJson(content) {
        const currentDate = new Date().toLocaleDateString('pt-BR');
        
        return {
            title: `Notícias de ${currentDate} - Análise Empresarial Completa`,
            content: content.substring(0, 2000) || `Roteiro empresarial sobre notícias de ${currentDate}`,
            hook: `Descubra as principais notícias empresariais de hoje, ${currentDate}`,
            keyPoints: ["Notícia principal", "Análise econômica", "Impactos globais", "Tendências futuras"],
            duration: "180",
            seoKeywords: ["noticias", currentDate.replace(/\//g, ''), "mundo", "empresarial"],
            callToAction: "Curta o vídeo, se inscreva no canal e ative as notificações para análises diárias exclusivas!"
        };
    }
    
    calculateQualityScore(data) {
        let score = 5;
        if (data.title && data.title.length > 30) score += 1.5;
        if (data.content && data.content.length > 800) score += 2;
        if (data.hook && data.hook.length > 25) score += 1;
        if (data.keyPoints && data.keyPoints.length >= 4) score += 1.5;
        return Math.min(score, 10);
    }
    
    async healthCheck() {
        const enabledProviders = this.imageProviders.map(p => p.name);
        const totalKeys = this.geminiKeys.length + this.togetherKeys.length + this.hfTokens.length + 
                         this.replicateTokens.length + this.stabilityKeys.length + this.leonardoKeys.length + 
                         this.openaiKeys.length;
        
        return {
            status: 'healthy',
            service: 'Gemini Enterprise Rotation V6.0',
            textModel: this.textModel,
            totalAPIKeys: totalKeys,
            imageProviders: enabledProviders,
            rotationEnabled: true,
            features: {
                enterpriseRotation: true,
                multiProviderFallback: true,
                quotaManagement: true,
                performanceTracking: true,
                unlimitedBackup: true // Pollinations
            }
        };
    }
    
    getUsageStats() {
        const stats = {};
        
        for (const [provider, data] of this.apiUsage.entries()) {
            const total = data.success + data.errors;
            const successRate = total > 0 ? (data.success / total * 100).toFixed(1) : 0;
            
            stats[provider] = {
                ...data,
                successRate: `${successRate}%`,
                inCooldown: this.isProviderInCooldown(provider)
            };
        }
        
        return stats;
    }
    
    async generateImageSequence() {
        console.log('🎨 Enterprise Rotation - Sistema mais robusto do mundo!');
        return { total: 0, successful: 0, images: [], jobId: 'enterprise-rotation' };
    }
}

module.exports = GeminiEnterpriseRotation;
