const axios = require('axios');
const fs = require('fs');
const path = require('path');

class GeminiUltimateGenerator {
    constructor(dependencies) {
        this.logger = dependencies.logger || console;
        this.cache = dependencies.cache;
        
        // Usar chaves do ambiente
        this.geminiKeys = [
            process.env.GEMINI_API_KEY,
            process.env.GEMINI_API_KEY_2,
            process.env.GEMINI_API_KEY_3,
            process.env.GEMINI_API_KEY_4,
            process.env.GEMINI_API_KEY_5
        ].filter(key => key);
        
        this.currentKeyIndex = 0;
        this.maxRetries = 3;
        this.backoffMs = 1500;
        this.requestsPerMinute = 15;
        this.lastRequestTimes = [];
        
        // Paths
        this.imageOutputDir = '/home/user/main/novo3/novo/outputs/images';
        
        this.ensureDirectories();
    }
    
    ensureDirectories() {
        const dirs = [
            this.imageOutputDir,
            '/home/user/main/novo3/novo/cache',
            '/home/user/main/novo3/novo/logs',
            '/home/user/main/novo3/novo/temp'
        ];
        
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
    
    async generateScript(params) {
        const { topic, style, duration } = params;
        
        await this.checkRateLimit();
        
        const prompt = `PIPELINE ULTIMATE V5.0 - GERAÇÃO DE ROTEIRO PREMIUM

Tópico: "${topic}"
Estilo: ${style}
Duração: ${duration}

ACESSO WEB TEMPO REAL: Use informações atualizadas de 2025.

ESTRUTURA ULTIMATE:
1. HOOK Magnético (0-15s)
2. PROMESSA de Valor (15-30s)  
3. CONTEÚDO Principal (3-7 pontos)
4. CALL TO ACTION Específico

Retorne JSON otimizado:
{
  "title": "Título SEO + engajamento",
  "content": "Roteiro detalhado premium", 
  "hook": "Abertura irresistível",
  "keyPoints": ["ponto1", "ponto2", "ponto3"],
  "duration": "tempo em segundos",
  "seoKeywords": ["palavra1", "palavra2"],
  "callToAction": "CTA específico",
  "qualityScore": 9.2
}`;

        const result = await this.callGeminiWithRetry(
            prompt, 
            'gemini-2.0-flash-exp',
            'script-generation'
        );
        
        return result;
    }
    
    async generateImageSequence(promptsData, jobId) {
        const { prompts } = promptsData.data;
        const results = [];
        
        console.log(`�� Pipeline Ultimate: ${prompts.length} imagens com Gemini Flash Image`);
        
        for (let i = 0; i < prompts.length; i++) {
            const promptItem = prompts[i];
            
            try {
                await this.checkRateLimit();
                
                const imageResult = await this.generateSingleImage({
                    prompt: promptItem.prompt,
                    jobId,
                    sceneIndex: i + 1,
                    description: promptItem.description
                });
                
                results.push({
                    scene: promptItem.scene,
                    description: promptItem.description,
                    success: true,
                    ...imageResult
                });
                
                console.log(`✅ Imagem ${i + 1}/${prompts.length}: ${imageResult.filename}`);
                
            } catch (error) {
                console.error(`❌ Erro imagem ${i + 1}: ${error.message}`);
                results.push({
                    scene: promptItem.scene,
                    description: promptItem.description,
                    success: false,
                    error: error.message
                });
            }
        }
        
        const successful = results.filter(r => r.success).length;
        
        return {
            total: prompts.length,
            successful,
            failed: prompts.length - successful,
            images: results,
            jobId,
            qualityScore: successful / prompts.length * 10
        };
    }
    
    async generateSingleImage(options) {
        const { prompt, jobId, sceneIndex } = options;
        
        const enhancedPrompt = `${prompt}
        
ULTIMATE QUALITY REQUIREMENTS:
- Resolution: 1280x720 (16:9)
- Professional grade, high quality
- Consistent visual identity`;

        const result = await this.callGeminiWithRetry(
            enhancedPrompt,
            'gemini-2.5-flash-image-preview',
            'image-generation',
            { responseModalities: ['Image'] }
        );
        
        if (result.success && result.imageData) {
            const filename = `${jobId}_ultimate_scene${sceneIndex.toString().padStart(2, '0')}.png`;
            const imagePath = path.join(this.imageOutputDir, filename);
            
            const buffer = Buffer.from(result.imageData, 'base64');
            fs.writeFileSync(imagePath, buffer);
            
            const stats = fs.statSync(imagePath);
            
            return {
                filename,
                imagePath,
                imageUrl: `/images/${filename}`,
                fileSize: stats.size,
                fileSizeKB: Math.round(stats.size / 1024),
                qualityScore: this.calculateImageQuality(stats.size),
                apiUsed: result.apiUsed,
                retriesUsed: result.retriesUsed
            };
        }
        
        throw new Error('Falha na geração Ultimate');
    }
    
    async checkRateLimit() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        
        this.lastRequestTimes = this.lastRequestTimes.filter(time => time > oneMinuteAgo);
        
        if (this.lastRequestTimes.length >= this.requestsPerMinute) {
            const oldestRequest = Math.min(...this.lastRequestTimes);
            const waitTime = 60000 - (now - oldestRequest);
            
            console.log(`⏱️ Rate limit: aguardando ${Math.ceil(waitTime/1000)}s`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastRequestTimes.push(now);
    }
    
    async callGeminiWithRetry(prompt, model, operation, options = {}) {
        let lastError = null;
        
        for (let retry = 0; retry < this.maxRetries; retry++) {
            for (let keyIndex = 0; keyIndex < this.geminiKeys.length; keyIndex++) {
                try {
                    const apiKey = this.geminiKeys[(this.currentKeyIndex + keyIndex) % this.geminiKeys.length];
                    if (!apiKey) continue;
                    
                    console.log(`🧠 ${model} ${operation} - API ${keyIndex + 1}/${this.geminiKeys.length}`);
                    
                    const requestConfig = {
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.7,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: model.includes('image') ? 1000 : 4096,
                            ...options.responseModalities && { responseModalities: options.responseModalities }
                        },
                        safetySettings: [
                            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
                        ]
                    };
                    
                    const response = await axios.post(
                        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                        requestConfig,
                        {
                            timeout: 45000,
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                    
                    const parts = response.data.candidates[0].content.parts;
                    this.currentKeyIndex = (this.currentKeyIndex + keyIndex + 1) % this.geminiKeys.length;
                    
                    if (model.includes('image')) {
                        const imagePart = parts.find(part => part.inlineData);
                        if (imagePart) {
                            return {
                                success: true,
                                imageData: imagePart.inlineData.data,
                                apiUsed: keyIndex + 1,
                                retriesUsed: retry
                            };
                        }
                    } else {
                        const textPart = parts.find(part => part.text);
                        if (textPart) {
                            const content = textPart.text;
                            const jsonResult = this.parseJsonResponse(content);
                            
                            return {
                                success: true,
                                data: jsonResult,
                                apiUsed: keyIndex + 1,
                                retriesUsed: retry
                            };
                        }
                    }
                    
                } catch (error) {
                    lastError = error;
                    console.log(`❌ API ${keyIndex + 1} falhou: ${error.message}`);
                    
                    if (error.response?.status === 429 || error.response?.status === 403) {
                        continue;
                    }
                    continue;
                }
            }
            
            if (retry < this.maxRetries - 1) {
                const delay = this.backoffMs * Math.pow(2, retry);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw new Error(`Pipeline Ultimate: Falha após ${this.maxRetries} tentativas. ${lastError?.message}`);
    }
    
    calculateQualityScore(data) {
        let score = 5;
        if (data.title && data.title.length > 20) score += 1;
        if (data.content && data.content.length > 500) score += 1;
        if (data.hook && data.hook.length > 10) score += 1;
        if (data.keyPoints && data.keyPoints.length >= 3) score += 1;
        if (data.callToAction && data.callToAction.length > 10) score += 1;
        return Math.min(score, 10);
    }
    
    calculateImageQuality(fileSize) {
        if (fileSize > 500000) return 9;
        if (fileSize > 200000) return 7;
        if (fileSize > 100000) return 6;
        return 5;
    }
    
    parseJsonResponse(content) {
        try {
            return JSON.parse(content);
        } catch (e) {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('Resposta inválida');
        }
    }
    
    async healthCheck() {
        return {
            status: 'healthy',
            service: 'Gemini Ultimate Generator V5.0',
            version: '5.0.0',
            features: {
                geminiKeys: this.geminiKeys.length,
                rateLimiting: this.requestsPerMinute,
                qualityControl: true,
                imageGeneration: true,
                textGeneration: true
            }
        };
    }
}

module.exports = GeminiUltimateGenerator;
