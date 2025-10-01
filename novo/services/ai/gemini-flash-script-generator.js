const axios = require('axios');

class GeminiFlashScriptGenerator {
    constructor(dependencies) {
        this.config = dependencies.config;
        this.logger = dependencies.logger;
        this.cache = dependencies.cache;
        
        // Múltiplas APIs Gemini com rotação
        this.geminiKeys = [
            process.env.GEMINI_API_KEY_1,
            process.env.GEMINI_API_KEY_2,
            process.env.GEMINI_API_KEY_3,
            process.env.GEMINI_API_KEY_4,
            process.env.GEMINI_API_KEY_5
        ].filter(key => key);
        
        this.currentKeyIndex = 0;
        this.maxRetries = 3;
        this.backoffMs = 1000;
    }
    
    async generateScript(params) {
        const { topic, style, duration } = params;
        
        const prompt = `Você é um especialista em roteiros para vídeos do YouTube. Crie um roteiro detalhado sobre "${topic}" no estilo ${style}.

REQUISITOS ESPECÍFICOS:
- Duração: ${duration} (short=3-5min, medium=5-10min, long=10+min)
- Pesquise informações ATUAIS e PRECISAS na web em tempo real
- Crie introdução ENVOLVENTE (primeiros 15 segundos cruciais)
- Estruture com ganchos para manter atenção
- Use dados recentes e exemplos práticos
- Inclua call-to-action eficaz

ESTRUTURA OBRIGATÓRIA:
1. HOOK inicial (0-15s): Frase impactante
2. PROMESSA (15-30s): O que o viewer vai aprender
3. CONTEÚDO PRINCIPAL: 3-5 pontos chave
4. CALL TO ACTION: Inscreva-se e comente

ESTILO ${style.toUpperCase()}:
${this.getStyleGuidelines(style)}

IMPORTANTE: Use informações ATUAIS de 2024-2025. Pesquise na web se necessário.

Retorne em formato JSON:
{
  "title": "Título otimizado para SEO",
  "content": "Roteiro completo",
  "hook": "Frase de abertura",
  "keyPoints": ["ponto1", "ponto2", "ponto3"],
  "duration": "tempo estimado em segundos",
  "seoKeywords": ["palavra1", "palavra2"],
  "callToAction": "CTA específico"
}`;

        return this.callGeminiWithRetry(prompt, 'script-generation');
    }
    
    async generateVideoPrompts(scriptData, thumbnailData) {
        const { script } = scriptData;
        
        const prompt = `Como especialista em direção de vídeo e prompts para IA, crie uma série de prompts DETALHADOS em INGLÊS para gerar imagens coerentes que formarão um vídeo sobre: "${script.title}"

ROTEIRO BASE:
${script.content}

REQUISITOS DE CONSISTÊNCIA VISUAL:
- MESMO ESTILO artístico em todas as cenas
- MESMA PALETA de cores
- PERSONAGENS consistentes (se houver)
- CENÁRIOS harmoniosos
- TRANSIÇÕES fluidas

GERE 8-12 PROMPTS DETALHADOS para sequência do vídeo:

EXEMPLO DE PROMPT DETALHADO:
"Professional digital illustration, modern tech style, vibrant blue and purple color palette, clean corporate aesthetic, AI robot character with friendly expression, futuristic office environment, soft lighting, high quality, 16:9 aspect ratio, consistent character design"

IMPORTANTE:
- Todos os prompts devem ter IDENTIDADE VISUAL consistente
- Use INGLÊS técnico preciso
- Especifique estilo, cores, iluminação, qualidade
- Mantenha coerência entre todas as cenas
- Adapte ao conteúdo do roteiro

Retorne JSON:
{
  "visualStyle": "Descrição do estilo visual geral",
  "colorPalette": ["cor1", "cor2", "cor3"],
  "characters": "Descrição dos personagens (se houver)",
  "environment": "Descrição do ambiente/cenário",
  "prompts": [
    {
      "scene": 1,
      "description": "Descrição da cena",
      "prompt": "Prompt detalhado em inglês",
      "duration": "segundos desta cena"
    }
  ]
}`;

        return this.callGeminiWithRetry(prompt, 'prompt-generation');
    }
    
    async callGeminiWithRetry(prompt, type) {
        let lastError = null;
        
        for (let retry = 0; retry < this.maxRetries; retry++) {
            for (let keyIndex = 0; keyIndex < this.geminiKeys.length; keyIndex++) {
                try {
                    const apiKey = this.geminiKeys[(this.currentKeyIndex + keyIndex) % this.geminiKeys.length];
                    
                    if (!apiKey) continue;
                    
                    console.log(`🧠 Gemini Flash ${type} - API ${keyIndex + 1} - Tentativa ${retry + 1}`);
                    
                    const response = await axios.post(
                        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
                        {
                            contents: [{
                                parts: [{
                                    text: prompt
                                }]
                            }],
                            generationConfig: {
                                temperature: 0.7,
                                topK: 40,
                                topP: 0.95,
                                maxOutputTokens: 4096,
                            },
                            safetySettings: [
                                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
                            ]
                        },
                        {
                            timeout: 30000,
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    
                    const content = response.data.candidates[0].content.parts[0].text;
                    
                    // Tentar parsear JSON
                    try {
                        const jsonResult = JSON.parse(content);
                        
                        console.log(`✅ Gemini Flash ${type} - Sucesso com API ${keyIndex + 1}`);
                        
                        // Rotacionar para próxima API na próxima chamada
                        this.currentKeyIndex = (this.currentKeyIndex + keyIndex + 1) % this.geminiKeys.length;
                        
                        return {
                            success: true,
                            data: jsonResult,
                            apiUsed: keyIndex + 1,
                            retriesUsed: retry
                        };
                        
                    } catch (jsonError) {
                        console.log(`⚠️ Resposta não é JSON válido, tentando limpar...`);
                        
                        // Tentar extrair JSON da resposta
                        const jsonMatch = content.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            try {
                                const cleanedJson = JSON.parse(jsonMatch[0]);
                                console.log(`✅ JSON extraído com sucesso`);
                                
                                return {
                                    success: true,
                                    data: cleanedJson,
                                    apiUsed: keyIndex + 1,
                                    retriesUsed: retry,
                                    cleaned: true
                                };
                            } catch (e) {
                                throw new Error('Resposta inválida do Gemini');
                            }
                        } else {
                            throw new Error('Resposta não contém JSON válido');
                        }
                    }
                    
                } catch (error) {
                    lastError = error;
                    console.log(`❌ API ${keyIndex + 1} falhou: ${error.message}`);
                    
                    // Se for erro de quota/limite, pular para próxima API
                    if (error.response?.status === 429 || error.response?.status === 403) {
                        console.log(`🔄 Quota excedida, mudando para próxima API...`);
                        continue;
                    }
                    
                    // Outros erros, tentar próxima API
                    continue;
                }
            }
            
            // Todas as APIs falharam, fazer backoff exponencial
            if (retry < this.maxRetries - 1) {
                const delay = this.backoffMs * Math.pow(2, retry);
                console.log(`⏱️ Aguardando ${delay}ms antes de tentar novamente...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw new Error(`Todas as APIs Gemini falharam após ${this.maxRetries} tentativas. Último erro: ${lastError?.message}`);
    }
    
    getStyleGuidelines(style) {
        const guidelines = {
            'educativo': 'Tom professoral, explicações claras, exemplos práticos, linguagem acessível mas técnica',
            'entretenimento': 'Tom descontraído, curiosidades, storytelling envolvente, humor quando apropriado', 
            'news': 'Tom jornalístico, fatos precisos, contexto atual, linguagem formal mas acessível',
            'tutorial': 'Passo a passo detalhado, linguagem imperativa, checkpoints, call-to-actions práticos'
        };
        
        return guidelines[style] || guidelines['educativo'];
    }
    
    async healthCheck() {
        return {
            status: 'healthy',
            service: 'Gemini Flash Script Generator',
            features: {
                realTimeWeb: true,
                multipleAPIs: this.geminiKeys.length,
                retrySystem: true,
                backoffExponential: true,
                styles: ['educativo', 'entretenimento', 'news', 'tutorial']
            },
            apis: {
                total: this.geminiKeys.length,
                current: this.currentKeyIndex + 1
            }
        };
    }
}

module.exports = GeminiFlashScriptGenerator;
