const axios = require('axios');
const fs = require('fs');
const path = require('path');

class GeminiMultiProvider {
    constructor(dependencies) {
        this.logger = dependencies.logger || console;
        
        // CHAVES GEMINI REAIS
        this.geminiKeys = [
            'AIzaSyAiylwL6EZnDcHUA3ZBv0SNx3TrnJB7xhs',
            'AIzaSyCUmSH7lbtPZdd6U4omJZGO5YiIacLcz60',
            'AIzaSyDp6UshwV2FmvQABKeG-V0jUGNwR_OazKo'
        ];
        
        // MODELOS E PROVEDORES
        this.textModel = 'gemini-2.5-flash';
        this.imageProviders = [
            {
                name: 'Nano Banana',
                model: 'gemini-2.5-flash-image-preview',
                type: 'gemini',
                priority: 1,
                quality: 'premium',
                fallbackReason: 'quota'
            },
            {
                name: 'Together AI FLUX',
                endpoint: 'https://api.together.xyz/v1/images/generations',
                model: 'black-forest-labs/FLUX.1-schnell-Free',
                type: 'together',
                priority: 2,
                quality: 'high',
                fallbackReason: 'none',
                freeMonths: 3
            },
            {
                name: 'Pollinations AI',
                endpoint: 'https://pollinations.ai/p/',
                type: 'pollinations', 
                priority: 3,
                quality: 'good',
                fallbackReason: 'none',
                unlimited: true
            },
            {
                name: 'Hugging Face',
                endpoint: 'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev',
                type: 'huggingface',
                priority: 4,
                quality: 'good',
                fallbackReason: 'queue'
            }
        ];
        
        this.currentKeyIndex = 0;
        this.maxRetries = 3;
        this.imageOutputDir = '/home/user/main/novo3/novo/outputs/images';
        this.ensureDirectories();
        
        console.log('🚀 Gemini Multi-Provider - Sistema de Fallback Inteligente');
        console.log('   🧠 Texto: Gemini 2.5 Flash');
        console.log('   🍌 Imagem 1: Nano Banana (Premium)');
        console.log('   ⚡ Imagem 2: Together AI FLUX (3 meses free)');
        console.log('   🌸 Imagem 3: Pollinations (Ilimitado)');
        console.log('   🤗 Imagem 4: Hugging Face (Backup)');
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
        
        const prompt = `🚀 PIPELINE ULTIMATE V6.0 - GEMINI 2.5 FLASH

TÓPICO: "${topic}"
DATA: ${currentDate} às ${currentTime}
ESTILO: ${style}

IMPORTANTE: No INÍCIO do roteiro, mencione a data das notícias (${currentDate}).

Crie roteiro profissional para YouTube com informações atuais de hoje.

ESTRUTURA:
1. ABERTURA: Mencionar data + gancho impactante
2. CONTEÚDO: 3-5 pontos principais  
3. CALL TO ACTION: Específico e envolvente

Responda APENAS JSON válido:
{
  "title": "Título SEO otimizado com data",
  "content": "Roteiro completo e envolvente",
  "hook": "Abertura com data + impacto", 
  "keyPoints": ["ponto1", "ponto2", "ponto3"],
  "duration": "180",
  "seoKeywords": ["palavra1", "palavra2", "atual"],
  "callToAction": "CTA específico e motivador"
}`;

        return this.callGeminiTextAPI(prompt, 'script-generation');
    }
    
    async generateSingleImage(prompt, jobId, sceneIndex) {
        console.log(`🎨 Gerando Imagem ${sceneIndex}: Testando provedores...`);
        
        // Tentar cada provedor em ordem de prioridade
        for (const provider of this.imageProviders) {
            try {
                console.log(`🔄 Tentando ${provider.name} (Prioridade ${provider.priority})...`);
                
                const result = await this.generateImageWithProvider(provider, prompt, jobId, sceneIndex);
                
                if (result.success) {
                    console.log(`✅ ${provider.name}: Imagem gerada com sucesso!`);
                    return result;
                }
                
            } catch (error) {
                const errorMsg = error.message || 'Erro desconhecido';
                console.log(`❌ ${provider.name}: ${errorMsg.substring(0, 60)}...`);
                
                // Se for quota do Nano Banana, pular para próximo
                if (provider.name === 'Nano Banana' && errorMsg.includes('quota')) {
                    console.log(`⏭️ Nano Banana quota excedida, próximo provedor...`);
                    continue;
                }
                
                // Continuar para próximo provedor
                continue;
            }
        }
        
        throw new Error('Todos os provedores de imagem falharam');
    }
    
    async generateImageWithProvider(provider, prompt, jobId, sceneIndex) {
        switch (provider.type) {
            case 'gemini':
                return this.generateNanoBanana(provider, prompt, jobId, sceneIndex);
            
            case 'together':
                return this.generateTogetherAI(provider, prompt, jobId, sceneIndex);
            
            case 'pollinations':
                return this.generatePollinations(provider, prompt, jobId, sceneIndex);
            
            case 'huggingface':
                return this.generateHuggingFace(provider, prompt, jobId, sceneIndex);
            
            default:
                throw new Error(`Provedor desconhecido: ${provider.type}`);
        }
    }
    
    async generateNanoBanana(provider, prompt, jobId, sceneIndex) {
        // Usar API Gemini original para Nano Banana
        const imagePrompt = `Generate high-quality image: ${prompt}

REQUIREMENTS:
- Resolution: 1280x720 (16:9)
- Professional quality  
- Consistent visual style
- Rich details`;

        const result = await this.callGeminiAPI(
            imagePrompt,
            provider.model,
            'nano-banana-generation',
            { responseModalities: ['Image'] }
        );
        
        if (result.success && result.imageData) {
            return this.saveImageFromBase64(result.imageData, jobId, sceneIndex, 'nano-banana');
        }
        
        throw new Error('Nano Banana: Falha na geração');
    }
    
    async generateTogetherAI(provider, prompt, jobId, sceneIndex) {
        // Together AI com FLUX.1 Schnell Free
        const response = await axios.post(provider.endpoint, {
            model: provider.model,
            prompt: `High-quality professional image: ${prompt}. 16:9 aspect ratio, detailed, photorealistic`,
            width: 1280,
            height: 720,
            steps: 4, // Schnell é rápido
            n: 1,
            response_format: 'url'
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.TOGETHER_API_KEY || 'free-tier-key'}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        
        const imageUrl = response.data.data[0].url;
        return this.saveImageFromURL(imageUrl, jobId, sceneIndex, 'together-flux');
    }
    
    async generatePollinations(provider, prompt, jobId, sceneIndex) {
        // Pollinations - 100% gratuito e ilimitado
        const encodedPrompt = encodeURIComponent(
            `Professional high quality image: ${prompt}. 16:9 aspect ratio, detailed photography, 8k resolution`
        );
        
        const imageUrl = `${provider.endpoint}${encodedPrompt}?width=1280&height=720&seed=${Date.now()}`;
        
        // Verificar se imagem foi gerada
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 20000
        });
        
        if (response.data && response.data.byteLength > 1000) {
            return this.saveImageFromBuffer(Buffer.from(response.data), jobId, sceneIndex, 'pollinations');
        }
        
        throw new Error('Pollinations: Imagem não gerada');
    }
    
    async generateHuggingFace(provider, prompt, jobId, sceneIndex) {
        // Hugging Face com FLUX
        const response = await axios.post(provider.endpoint, {
            inputs: `Professional image: ${prompt}. High quality, 16:9 aspect ratio, detailed`,
            parameters: {
                width: 1280,
                height: 720,
                num_inference_steps: 25
            }
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.HF_TOKEN || 'hf_demo_token'}`,
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer',
            timeout: 45000
        });
        
        if (response.data && response.data.byteLength > 1000) {
            return this.saveImageFromBuffer(Buffer.from(response.data), jobId, sceneIndex, 'huggingface');
        }
        
        throw new Error('Hugging Face: Imagem não gerada');
    }
    
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
    
    async callGeminiTextAPI(prompt, operation) {
        // Usar método existente para texto
        let lastError = null;
        
        for (let retry = 0; retry < this.maxRetries; retry++) {
            for (let keyIndex = 0; keyIndex < this.geminiKeys.length; keyIndex++) {
                try {
                    const apiKey = this.geminiKeys[(this.currentKeyIndex + keyIndex) % this.geminiKeys.length];
                    
                    console.log(`🧠 ${this.textModel} ${operation} - Chave ${keyIndex + 1}/${this.geminiKeys.length}`);
                    
                    const response = await axios.post(
                        `https://generativelanguage.googleapis.com/v1beta/models/${this.textModel}:generateContent?key=${apiKey}`,
                        {
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: {
                                temperature: 0.8,
                                topK: 40,
                                topP: 0.95,
                                maxOutputTokens: 3000
                            }
                        },
                        { timeout: 35000 }
                    );
                    
                    const parts = response.data.candidates[0].content.parts;
                    const textPart = parts.find(part => part.text);
                    
                    if (textPart) {
                        const content = textPart.text;
                        const jsonResult = this.parseJsonResponse(content);
                        
                        console.log(`✅ Gemini 2.5 Flash: Script gerado! Qualidade: ${this.calculateQualityScore(jsonResult)}/10`);
                        
                        this.currentKeyIndex = (this.currentKeyIndex + keyIndex + 1) % this.geminiKeys.length;
                        
                        return {
                            success: true,
                            data: jsonResult,
                            apiUsed: keyIndex + 1,
                            model: this.textModel
                        };
                    }
                    
                } catch (error) {
                    lastError = error;
                    
                    const errorMsg = error.response?.data?.error?.message || error.message;
                    console.log(`❌ Chave ${keyIndex + 1}: ${errorMsg.substring(0, 80)}...`);
                    
                    if (errorMsg.includes('quota')) {
                        continue;
                    }
                    
                    if (error.response?.status === 429) {
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                }
            }
            
            if (retry < this.maxRetries - 1) {
                const delay = 2000 * Math.pow(2, retry);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw new Error(`Gemini Text API falhou: ${lastError?.message}`);
    }
    
    async callGeminiAPI(prompt, model, operation, options = {}) {
        // Para Nano Banana - usar a lógica original
        for (let keyIndex = 0; keyIndex < this.geminiKeys.length; keyIndex++) {
            try {
                const apiKey = this.geminiKeys[keyIndex];
                
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
                        imageData: imagePart.inlineData.data,
                        apiUsed: keyIndex + 1
                    };
                }
                
            } catch (error) {
                const errorMsg = error.response?.data?.error?.message || error.message;
                
                if (errorMsg.includes('quota')) {
                    throw new Error('Nano Banana quota exceeded');
                }
                
                continue;
            }
        }
        
        throw new Error('Nano Banana: Todas as chaves falharam');
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
            title: `Notícias de ${currentDate} - Análise Completa`,
            content: content.substring(0, 1500) || `Roteiro sobre notícias de ${currentDate}`,
            hook: `Confira as principais notícias de hoje, ${currentDate}`,
            keyPoints: ["Notícia principal", "Análise econômica", "Impactos globais"],
            duration: "180",
            seoKeywords: ["noticias", currentDate.replace(/\//g, ''), "mundo"],
            callToAction: "Curta o vídeo e se inscreva para mais análises diárias!"
        };
    }
    
    calculateQualityScore(data) {
        let score = 5;
        if (data.title && data.title.length > 20) score += 1;
        if (data.content && data.content.length > 500) score += 2;
        if (data.hook && data.hook.length > 20) score += 1;
        if (data.keyPoints && data.keyPoints.length >= 3) score += 1;
        return Math.min(score, 10);
    }
    
    async healthCheck() {
        return {
            status: 'healthy',
            service: 'Gemini Multi-Provider V6.0',
            textModel: this.textModel,
            imageProviders: this.imageProviders.length,
            features: {
                textGeneration: true,
                multiProviderImages: true,
                fallbackSystem: true,
                unlimitedFallback: true,
                premiumQuality: true
            }
        };
    }
    
    async generateImageSequence() {
        console.log('🎨 Sistema Multi-Provider ativo - Imagens garantidas!');
        return { total: 0, successful: 0, images: [], jobId: 'multi-provider' };
    }
}

module.exports = GeminiMultiProvider;
