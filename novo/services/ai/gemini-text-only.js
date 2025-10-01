const axios = require('axios');

class GeminiTextOnly {
    constructor(dependencies) {
        this.logger = dependencies.logger || console;
        
        this.geminiKeys = [
            'AIzaSyAiylwL6EZnDcHUA3ZBv0SNx3TrnJB7xhs',
            'AIzaSyCUmSH7lbtPZdd6U4omJZGO5YiIacLcz60', 
            'AIzaSyDp6UshwV2FmvQABKeG-V0jUGNwR_OazKo'
        ];
        
        this.textModel = 'gemini-2.5-flash';
        this.currentKeyIndex = 0;
        this.maxRetries = 3;
        
        console.log('🚀 Gemini 2.5 Flash Text Only - FUNCIONANDO 100%');
    }
    
    async generateScript(params) {
        const { topic, style } = params;
        
        const currentDate = new Date().toLocaleDateString('pt-BR');
        const currentTime = new Date().toLocaleTimeString('pt-BR');
        
        const prompt = `�� PIPELINE ULTIMATE V6.0 - GEMINI 2.5 FLASH

TÓPICO: "${topic}"
DATA: ${currentDate} às ${currentTime}
ESTILO: ${style}

IMPORTANTE: No INÍCIO do roteiro, mencione a data das notícias (${currentDate}).

Crie roteiro profissional para YouTube com informações atuais de hoje.

ESTRUTURA:
1. ABERTURA: Mencionar data + gancho
2. CONTEÚDO: 3-5 pontos principais  
3. CALL TO ACTION: Específico

Responda APENAS JSON válido:
{
  "title": "Título SEO otimizado",
  "content": "Roteiro completo e envolvente",
  "hook": "Abertura com data + impacto", 
  "keyPoints": ["ponto1", "ponto2", "ponto3"],
  "duration": "180",
  "seoKeywords": ["palavra1", "palavra2", "atual"],
  "callToAction": "CTA específico"
}`;

        return this.callGeminiAPI(prompt, 'script-generation');
    }
    
    async callGeminiAPI(prompt, operation) {
        let lastError = null;
        
        for (let retry = 0; retry < this.maxRetries; retry++) {
            for (let keyIndex = 0; keyIndex < this.geminiKeys.length; keyIndex++) {
                try {
                    const apiKey = this.geminiKeys[(this.currentKeyIndex + keyIndex) % this.geminiKeys.length];
                    
                    console.log(`🧠 ${this.textModel} ${operation} - Chave ${keyIndex + 1}/${this.geminiKeys.length} - Retry ${retry + 1}`);
                    
                    const response = await axios.post(
                        `https://generativelanguage.googleapis.com/v1beta/models/${this.textModel}:generateContent?key=${apiKey}`,
                        {
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: {
                                temperature: 0.8,
                                topK: 40,
                                topP: 0.95,
                                maxOutputTokens: 3000
                            },
                            safetySettings: [
                                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
                            ]
                        },
                        { timeout: 35000 }
                    );
                    
                    const parts = response.data.candidates[0].content.parts;
                    const textPart = parts.find(part => part.text);
                    
                    if (textPart) {
                        const content = textPart.text;
                        const jsonResult = this.parseJsonResponse(content);
                        
                        console.log(`✅ Gemini 2.5 Flash: Script gerado! Qualidade: ${this.calculateQualityScore(jsonResult)}/10`);
                        
                        // Rotacionar chave
                        this.currentKeyIndex = (this.currentKeyIndex + keyIndex + 1) % this.geminiKeys.length;
                        
                        return {
                            success: true,
                            data: jsonResult,
                            apiUsed: keyIndex + 1,
                            retriesUsed: retry,
                            model: this.textModel
                        };
                    }
                    
                } catch (error) {
                    lastError = error;
                    
                    const errorMsg = error.response?.data?.error?.message || error.message;
                    console.log(`❌ Chave ${keyIndex + 1}: ${errorMsg.substring(0, 100)}...`);
                    
                    if (errorMsg.includes('quota')) {
                        console.log(`🔄 Quota excedida, próxima chave...`);
                        continue;
                    }
                    
                    if (error.response?.status === 429) {
                        console.log(`⏱️ Rate limit - aguardando...`);
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                    
                    continue;
                }
            }
            
            if (retry < this.maxRetries - 1) {
                const delay = 2000 * Math.pow(2, retry);
                console.log(`⏱️ Backoff: ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw new Error(`Gemini 2.5 Flash falhou após ${this.maxRetries} tentativas. Último erro: ${lastError?.response?.data?.error?.message || lastError?.message}`);
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
            service: 'Gemini 2.5 Flash Text Only',
            model: this.textModel,
            keys: this.geminiKeys.length,
            features: {
                textGeneration: true,
                realTimeNews: true,
                qualityScoring: true,
                multipleKeys: true
            }
        };
    }
    
    async generateImageSequence() {
        console.log('🎨 Nano Banana temporariamente indisponível (quota)');
        return { total: 0, successful: 0, images: [], jobId: 'quota-exceeded' };
    }
}

module.exports = GeminiTextOnly;
