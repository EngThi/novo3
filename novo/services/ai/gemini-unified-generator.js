const axios = require('axios');
const fs = require('fs');
const path = require('path');

class GeminiUnifiedGenerator {
    constructor(dependencies) {
        this.config = dependencies.config;
        this.logger = dependencies.logger;
        this.cache = dependencies.cache;
        
        // Múltiplas chaves Gemini para rotação (MESMO SISTEMA)
        this.geminiKeys = [
            process.env.GEMINI_API_KEY_1,
            process.env.GEMINI_API_KEY_2,
            process.env.GEMINI_API_KEY_3,
            process.env.GEMINI_API_KEY_4,
            process.env.GEMINI_API_KEY_5
        ].filter(key => key);
        
        this.currentKeyIndex = 0;
        this.maxRetries = 3;
        this.backoffMs = 1500;
        
        // Paths
        this.imageOutputDir = '/home/user/main/novo3/novo/outputs/images';
        
        if (!fs.existsSync(this.imageOutputDir)) {
            fs.mkdirSync(this.imageOutputDir, { recursive: true });
        }
    }
    
    async generateScript(params) {
        const { topic, style, duration } = params;
        
        const prompt = `Você é um especialista em roteiros para vídeos do YouTube. Crie um roteiro detalhado sobre "${topic}" no estilo ${style}.

ACESSO WEB EM TEMPO REAL: Use informações ATUAIS de 2025. Pesquise na web se necessário.

REQUISITOS:
- Duração: ${duration} (short=3-5min, medium=5-10min, long=10+min)  
- Introdução ENVOLVENTE (primeiros 15s cruciais)
- Estrutura com ganchos para manter atenção
- Dados recentes e exemplos práticos de 2025
- Call-to-action eficaz

ESTRUTURA:
1. HOOK (0-15s): Frase impactante
2. PROMESSA (15-30s): O que aprenderá  
3. CONTEÚDO: 3-5 pontos chave
4. CTA: Inscreva-se e comente

ESTILO ${style.toUpperCase()}: ${this.getStyleGuidelines(style)}

Retorne JSON:
{
  "title": "Título SEO otimizado",
  "content": "Roteiro completo detalhado", 
  "hook": "Frase de abertura impactante",
  "keyPoints": ["ponto1", "ponto2", "ponto3"],
  "duration": "tempo em segundos",
  "seoKeywords": ["palavra1", "palavra2"],
  "callToAction": "CTA específico"
}`;

        return this.callGeminiUnified(prompt, 'TEXT', 'script-generation');
    }
    
    async generateImagePrompts(scriptData) {
        const { script } = scriptData;
        
        const prompt = `Como diretor de arte especialista, crie prompts DETALHADOS em INGLÊS para gerar 8-12 imagens coerentes para o vídeo: "${script.title}"

ROTEIRO:
${script.content}

CONSISTÊNCIA VISUAL OBRIGATÓRIA:
- MESMO ESTILO artístico em todas as imagens
- MESMA PALETA de cores  
- PERSONAGENS consistentes (se houver)
- CENÁRIOS harmoniosos
- IDENTIDADE VISUAL única

EXEMPLO DE PROMPT PROFISSIONAL:
"Professional digital illustration, modern tech aesthetic, vibrant blue and purple gradient palette, clean minimalist style, friendly AI robot character with consistent design, futuristic office environment, soft natural lighting, high quality 8k, photorealistic details, 16:9 aspect ratio"

IMPORTANTE:
- Todos prompts em INGLÊS técnico
- Especificar: estilo, cores, iluminação, qualidade
- Manter coerência visual total
- Adaptar ao conteúdo do roteiro

JSON:
{
  "visualIdentity": "Descrição do estilo visual geral",
  "colorPalette": ["primary", "secondary", "accent"],
  "artStyle": "Estilo artístico (digital art, photography, etc)",
  "characters": "Personagens (se houver)",
  "environment": "Ambiente/cenário",
  "prompts": [
    {
      "scene": 1,
      "description": "Descrição da cena em português",
      "prompt": "Prompt detalhado em inglês para IA",
      "duration": 3
    }
  ]
}`;

        return this.callGeminiUnified(prompt, 'TEXT', 'prompt-generation');
    }
    
    async generateImageSequence(promptsData, jobId) {
        const { prompts } = promptsData.data;
        const results = [];
        
        console.log(`🎨 Gerando ${prompts.length} imagens com Nano Banana...`);
        
        for (let i = 0; i < prompts.length; i++) {
            const promptItem = prompts[i];
            
            try {
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
                
                // Delay entre imagens
                await new Promise(resolve => setTimeout(resolve, 800));
                
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
        console.log(`🎨 Sequência: ${successful}/${prompts.length} imagens geradas`);
        
        return {
            total: prompts.length,
            successful,
            failed: prompts.length - successful,
            images: results,
            jobId,
            visualIdentity: promptsData.data.visualIdentity
        };
    }
    
    async generateSingleImage(options) {
        const { prompt, jobId, sceneIndex } = options;
        
        // Usar Nano Banana (Gemini 2.5 Flash Image)  
        const imagePrompt = `Generate a high-quality image: ${prompt}
        
REQUIREMENTS:
- Resolution: 1280x720 (16:9)
- High quality, professional
- Consistent with previous images in sequence
- Rich details and vibrant colors`;

        const result = await this.callGeminiUnified(
            imagePrompt, 
            'IMAGE', 
            'image-generation'
        );
        
        if (result.success && result.imageData) {
            const filename = `${jobId}_scene${sceneIndex.toString().padStart(2, '0')}.png`;
            const imagePath = path.join(this.imageOutputDir, filename);
            
            // Salvar imagem base64
            const buffer = Buffer.from(result.imageData, 'base64');
            fs.writeFileSync(imagePath, buffer);
            
            const stats = fs.statSync(imagePath);
            
            return {
                filename,
                imagePath,
                imageUrl: `/images/${filename}`,
                fileSize: stats.size,
                fileSizeKB: Math.round(stats.size / 1024),
                prompt: prompt.substring(0, 100) + '...',
                apiUsed: result.apiUsed,
                retriesUsed: result.retriesUsed
            };
        }
        
        throw new Error('Falha na geração de imagem');
    }
    
    async callGeminiUnified(prompt, responseType, operation) {
        let lastError = null;
        
        for (let retry = 0; retry < this.maxRetries; retry++) {
            for (let keyIndex = 0; keyIndex < this.geminiKeys.length; keyIndex++) {
                try {
                    const apiKey = this.geminiKeys[(this.currentKeyIndex + keyIndex) % this.geminiKeys.length];
                    if (!apiKey) continue;
                    
                    console.log(`🧠 Gemini ${responseType} ${operation} - API ${keyIndex + 1} - Retry ${retry + 1}`);
                    
                    // Configurar modalidades de resposta
                    const responseModalities = responseType === 'IMAGE' ? ['Image'] : ['Text'];
                    const modelName = responseType === 'IMAGE' ? 
                        'gemini-2.5-flash-image-preview' : 
                        'gemini-2.0-flash-exp';
                    
                    const response = await axios.post(
                        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
                        {
                            contents: [{
                                parts: [{ text: prompt }]
                            }],
                            generationConfig: {
                                temperature: 0.7,
                                topK: 40,
                                topP: 0.95,
                                maxOutputTokens: responseType === 'IMAGE' ? 1000 : 4096,
                                responseModalities: responseModalities
                            },
                            safetySettings: [
                                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
                            ]
                        },
                        {
                            timeout: responseType === 'IMAGE' ? 60000 : 30000,
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                    
                    const parts = response.data.candidates[0].content.parts;
                    
                    // Rotacionar API
                    this.currentKeyIndex = (this.currentKeyIndex + keyIndex + 1) % this.geminiKeys.length;
                    
                    if (responseType === 'IMAGE') {
                        // Procurar imagem nos parts
                        const imagePart = parts.find(part => part.inlineData);
                        if (imagePart) {
                            console.log(`✅ Imagem gerada via Nano Banana`);
                            return {
                                success: true,
                                imageData: imagePart.inlineData.data,
                                apiUsed: keyIndex + 1,
                                retriesUsed: retry
                            };
                        }
                    } else {
                        // Procurar texto nos parts
                        const textPart = parts.find(part => part.text);
                        if (textPart) {
                            const content = textPart.text;
                            
                            // Parse JSON
                            try {
                                const jsonResult = JSON.parse(content);
                                console.log(`✅ ${operation} - Sucesso`);
                                
                                return {
                                    success: true,
                                    data: jsonResult,
                                    apiUsed: keyIndex + 1,
                                    retriesUsed: retry
                                };
                            } catch (jsonError) {
                                // Tentar extrair JSON
                                const jsonMatch = content.match(/\{[\s\S]*\}/);
                                if (jsonMatch) {
                                    const cleanedJson = JSON.parse(jsonMatch[0]);
                                    return {
                                        success: true,
                                        data: cleanedJson,
                                        apiUsed: keyIndex + 1,
                                        retriesUsed: retry,
                                        cleaned: true
                                    };
                                }
                                throw new Error('Resposta inválida');
                            }
                        }
                    }
                    
                    throw new Error('Resposta sem conteúdo válido');
                    
                } catch (error) {
                    lastError = error;
                    console.log(`❌ API ${keyIndex + 1} falhou: ${error.message}`);
                    
                    if (error.response?.status === 429 || error.response?.status === 403) {
                        console.log(`🔄 Quota excedida, próxima API...`);
                        continue;
                    }
                    continue;
                }
            }
            
            // Backoff exponencial
            if (retry < this.maxRetries - 1) {
                const delay = this.backoffMs * Math.pow(2, retry);
                console.log(`⏱️ Backoff: ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw new Error(`Gemini Unified: Todas APIs falharam. Último erro: ${lastError?.message}`);
    }
    
    getStyleGuidelines(style) {
        const guidelines = {
            'educativo': 'Tom professoral, explicações claras, exemplos práticos, linguagem acessível mas técnica',
            'entretenimento': 'Tom descontraído, curiosidades, storytelling envolvente, humor quando apropriado',
            'news': 'Tom jornalístico, fatos precisos, contexto atual de 2025, linguagem formal mas acessível',
            'tutorial': 'Passo a passo detalhado, linguagem imperativa, checkpoints, call-to-actions práticos'
        };
        
        return guidelines[style] || guidelines['educativo'];
    }
    
    async healthCheck() {
        return {
            status: 'healthy',
            service: 'Gemini Unified Generator',
            features: {
                textGeneration: true,
                imageGeneration: true, // Nano Banana
                realTimeWeb: true,
                multipleAPIs: this.geminiKeys.length,
                retrySystem: true,
                backoffExponential: true,
                consistentVisuals: true
            },
            models: {
                text: 'gemini-2.0-flash-exp',
                image: 'gemini-2.5-flash-image-preview (nano-banana)'
            },
            apis: {
                total: this.geminiKeys.length,
                current: this.currentKeyIndex + 1
            }
        };
    }
}

module.exports = GeminiUnifiedGenerator;
