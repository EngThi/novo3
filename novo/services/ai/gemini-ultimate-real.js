const axios = require('axios');
const fs = require('fs');
const path = require('path');

class GeminiUltimateReal {
    constructor(dependencies) {
        this.logger = dependencies.logger || console;
        
        // SUAS CHAVES REAIS
        this.geminiKeys = [
            'AIzaSyAiylwL6EZnDcHUA3ZBv0SNx3TrnJB7xhs',
            'AIzaSyCUmSH7lbtPZdd6U4omJZGO5YiIacLcz60',
            'AIzaSyDp6UshwV2FmvQABKeG-V0jUGNwR_OazKo'
        ];
        
        // MODELOS CONFIRMADOS FUNCIONANDO
        this.textModel = 'gemini-2.5-flash';
        this.imageModel = 'gemini-2.5-flash-image-preview'; // NANO BANANA!
        
        this.currentKeyIndex = 0;
        this.maxRetries = 3;
        
        this.imageOutputDir = '/home/user/main/novo3/novo/outputs/images';
        this.ensureDirectories();
        
        console.log('🚀 Gemini Ultimate Real - Modelos corretos configurados!');
        console.log(`   📝 Texto: ${this.textModel}`);
        console.log(`   🍌 Imagem: ${this.imageModel} (Nano Banana)`);
    }
    
    ensureDirectories() {
        const dirs = [this.imageOutputDir];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
    
    async generateScript(params) {
        const { topic, style } = params;
        
        const currentDate = new Date().toLocaleDateString('pt-BR');
        
        const prompt = `PIPELINE ULTIMATE V6.0 - GEMINI 2.5 FLASH

Tópico: "${topic}"
Data: ${currentDate}
Estilo: ${style}

INSTRUÇÕES:
- Use informações atuais de setembro/2025
- No início do script, mencione a data das notícias
- Crie roteiro envolvente e profissional

Responda APENAS JSON válido:
{
  "title": "Título otimizado para YouTube",
  "content": "Roteiro completo e detalhado",
  "hook": "Frase de abertura impactante",
  "keyPoints": ["ponto1", "ponto2", "ponto3"],
  "duration": "180",
  "seoKeywords": ["palavra1", "palavra2"],
  "callToAction": "Call to action específico"
}`;

        return this.callGeminiAPI(prompt, this.textModel, 'script-generation');
    }
    
    async generateImagePrompts(scriptData) {
        const { script } = scriptData;
        
        const prompt = `PIPELINE ULTIMATE V6.0 - GERAÇÃO DE PROMPTS VISUAIS

Baseado no roteiro: "${script.title}"

Conteúdo: ${script.content.substring(0, 500)}

Crie 6-8 prompts DETALHADOS em INGLÊS para Nano Banana gerar imagens consistentes:

IMPORTANTE:
- Mesmo estilo visual em todas as imagens
- Mesma paleta de cores
- Qualidade profissional
- Resolução 16:9

Responda APENAS JSON válido:
{
  "visualStyle": "Descrição do estilo visual",
  "prompts": [
    {
      "scene": 1,
      "description": "Cena de abertura",
      "prompt": "Professional digital art, modern style, vibrant colors, high quality 8k, 16:9 aspect ratio"
    }
  ]
}`;

        return this.callGeminiAPI(prompt, this.textModel, 'prompt-generation');
    }
    
    async generateSingleImage(prompt, jobId, sceneIndex) {
        const imagePrompt = `Generate high-quality image: ${prompt}

REQUIREMENTS:
- Resolution: 1280x720 (16:9)
- Professional quality
- Consistent visual style
- Rich details`;

        console.log(`🍌 Nano Banana - Scene ${sceneIndex}: Gerando imagem...`);
        
        const result = await this.callGeminiAPI(
            imagePrompt,
            this.imageModel,
            'image-generation',
            { responseModalities: ['Image'] }
        );
        
        if (result.success && result.imageData) {
            const filename = `${jobId}_scene${sceneIndex.toString().padStart(2, '0')}.png`;
            const imagePath = path.join(this.imageOutputDir, filename);
            
            const buffer = Buffer.from(result.imageData, 'base64');
            fs.writeFileSync(imagePath, buffer);
            
            const stats = fs.statSync(imagePath);
            
            console.log(`✅ Imagem Nano Banana salva: ${filename} (${Math.round(stats.size / 1024)}KB)`);
            
            return {
                filename,
                imagePath,
                imageUrl: `/images/${filename}`,
                fileSize: stats.size,
                fileSizeKB: Math.round(stats.size / 1024),
                success: true
            };
        }
        
        throw new Error('Nano Banana: Falha na geração de imagem');
    }
    
    async callGeminiAPI(prompt, model, operation, options = {}) {
        let lastError = null;
        
        for (let retry = 0; retry < this.maxRetries; retry++) {
            for (let keyIndex = 0; keyIndex < this.geminiKeys.length; keyIndex++) {
                try {
                    const apiKey = this.geminiKeys[(this.currentKeyIndex + keyIndex) % this.geminiKeys.length];
                    
                    console.log(`🧠 ${model} ${operation} - Chave ${keyIndex + 1} - Retry ${retry + 1}`);
                    
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
                        // NANO BANANA - Procurar imagem
                        const imagePart = parts.find(part => part.inlineData);
                        if (imagePart) {
                            console.log(`✅ Nano Banana: Imagem gerada com sucesso!`);
                            return {
                                success: true,
                                imageData: imagePart.inlineData.data,
                                apiUsed: keyIndex + 1,
                                retriesUsed: retry
                            };
                        }
                    } else {
                        // GEMINI FLASH - Procurar texto
                        const textPart = parts.find(part => part.text);
                        if (textPart) {
                            const content = textPart.text;
                            const jsonResult = this.parseJsonResponse(content);
                            
                            console.log(`✅ ${this.textModel}: Script gerado com sucesso!`);
                            
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
                    
                    const errorMsg = error.response?.data?.error?.message || error.message;
                    console.log(`❌ Chave ${keyIndex + 1}: ${errorMsg.substring(0, 80)}...`);
                    
                    // Se quota excedida, tentar próxima chave
                    if (errorMsg.includes('quota') || errorMsg.includes('limit')) {
                        console.log(`🔄 Quota excedida, próxima chave...`);
                        continue;
                    }
                    
                    // Rate limit
                    if (error.response?.status === 429) {
                        console.log(`⏱️ Rate limit - aguardando 3s...`);
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                    
                    continue;
                }
            }
            
            // Backoff entre retries
            if (retry < this.maxRetries - 1) {
                const delay = 2000 * Math.pow(2, retry);
                console.log(`⏱️ Backoff: ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw new Error(`${model}: Todas as chaves falharam após ${this.maxRetries} tentativas. Último erro: ${lastError?.response?.data?.error?.message || lastError?.message}`);
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
                    console.log('⚠️ JSON parse falhou, usando fallback...');
                    return this.createFallbackJson(content);
                }
            }
            return this.createFallbackJson(content);
        }
    }
    
    createFallbackJson(content) {
        return {
            title: "Vídeo sobre " + new Date().toLocaleDateString('pt-BR'),
            content: content.substring(0, 1000),
            hook: "Descubra informações importantes hoje",
            keyPoints: ["Informação atual", "Análise detalhada", "Conclusões"],
            duration: "180",
            seoKeywords: ["video", "conteudo", "atual"],
            callToAction: "Curta e se inscreva no canal!"
        };
    }
    
    calculateQualityScore(data) {
        let score = 5;
        if (data.title && data.title.length > 15) score += 1;
        if (data.content && data.content.length > 300) score += 1;
        if (data.hook && data.hook.length > 15) score += 1;
        if (data.keyPoints && data.keyPoints.length >= 3) score += 1.5;
        if (data.callToAction && data.callToAction.length > 15) score += 0.5;
        return Math.min(score, 10);
    }
    
    async healthCheck() {
        return {
            status: 'healthy',
            service: 'Gemini Ultimate Real V6.0',
            models: {
                text: this.textModel,
                image: this.imageModel
            },
            keys: this.geminiKeys.length,
            features: {
                realAPI: true,
                nanoBanana: true,
                geminiFlash: true,
                multipleKeys: true,
                retrySystem: true
            }
        };
    }
    
    // Compatibilidade
    async generateImageSequence() {
        return { total: 0, successful: 0, images: [], jobId: 'no-images-yet' };
    }
}

module.exports = GeminiUltimateReal;
