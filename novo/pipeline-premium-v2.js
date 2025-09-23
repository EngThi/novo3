require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { google } = require('googleapis');
const fs = require('fs').promises;
const fssync = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('./config-premium-v2');
const PipelineStateManager = require('./stateManager');

// Importar módulos premium
const ImageGeneratorPremium = require('./modules/image-generator-premium');
const TTSGeneratorPremium = require('./modules/tts-generator-premium');
const VideoProcessor = require('./modules/video-processor-free');
const StorageManager = require('./modules/storage-manager-free');
const CredentialManager = require('./modules/credential-manager');

// === CONFIGURAÇÃO GEMINI 2.5 FLASH ===
const credentialManager = new CredentialManager();
const imageGen = new ImageGeneratorPremium();
const ttsGen = new TTSGeneratorPremium();
const videoProc = new VideoProcessor();
const storage = new StorageManager();

// Configurações
const GOOGLE_DRIVE_REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SHEET_NAME = "T";
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const OAUTH_CLIENT_ID = '1060201687476-0c6m7fb4ttsmg84uibe6jh8utbmplr11.apps.googleusercontent.com';
const OAUTH_CLIENT_SECRET = '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';
const OAUTH_REDIRECT_URI = 'http://localhost:8080';
const BASE_OUTPUT_PATH = 'novo/output';

/**
 * Classe principal do Pipeline Premium v2.0
 * Otimizado para Gemini 2.5 Flash e recursos avançados
 */
class PipelinePremiumV2 {
    constructor() {
        this.startTime = null;
        this.metrics = {
            api_calls: 0,
            total_cost: 0,
            processing_time: {},
            quality_scores: {}
        };
        this.executionId = null;
        this.currentTemplate = null;
    }

    // === INICIALIZAÇÃO DO GEMINI 2.5 FLASH ===
    async initializeGemini() {
        try {
            const credential = await credentialManager.getNextCredential('gemini');
            const genAI = new GoogleGenerativeAI(credential.api_key);
            
            // Configurar modelo Gemini 2.5 Flash
            const model = genAI.getGenerativeModel({
                model: config.GEMINI_2_5_FLASH_CONFIG.model,
                generationConfig: config.GEMINI_2_5_FLASH_CONFIG.generationConfig,
                safetySettings: config.GEMINI_2_5_FLASH_CONFIG.safetySettings
            });
            
            return { model, credential };
        } catch (error) {
            // Fallback para environment variable
            if (process.env.GEMINI_API_KEY) {
                console.warn('⚠️ Usando Gemini API key de fallback');
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({
                    model: config.GEMINI_2_5_FLASH_CONFIG.model,
                    generationConfig: config.GEMINI_2_5_FLASH_CONFIG.generationConfig,
                    safetySettings: config.GEMINI_2_5_FLASH_CONFIG.safetySettings
                });
                return { model, credential: null };
            }
            throw new Error('❌ Nenhuma credencial Gemini disponível');
        }
    }

    // === ANÁLISE DE TENDÊNCIAS EM TEMPO REAL ===
    async analyzeTrends() {
        console.log('📊 Analisando tendências em tempo real...');
        const startTime = Date.now();

        const trendData = await this.collectTrendData();
        const { model, credential } = await this.initializeGemini();

        const prompt = `
Analise estas tendências do Brasil e identifique os 3 melhores tópicos para vídeos virais:

Tendências coletadas:
${JSON.stringify(trendData, null, 2)}

Retorne APENAS um JSON válido com esta estrutura:
{
  "topics": [
    {
      "titulo": "título clickbait otimizado",
      "categoria": "misterios-brasileiros | historias-urbanas | lendas-folclore", 
      "viral_score": 85,
      "target_audience": "descrição do público-alvo",
      "tags": ["tag1", "tag2", "tag3"],
      "reasoning": "por que este tópico tem potencial viral"
    }
  ]
}`;

        try {
            const result = await model.generateContent(prompt);
            const analysis = JSON.parse(result.response.text());
            
            if (credential) {
                await credentialManager.recordUsage(credential, 'gemini', true);
            }
            
            this.metrics.processing_time.trend_analysis = Date.now() - startTime;
            this.metrics.api_calls++;
            
            console.log(`✅ Análise concluída em ${this.metrics.processing_time.trend_analysis}ms`);
            return analysis.topics[0]; // Retorna o melhor tópico
            
        } catch (error) {
            if (credential) {
                await credentialManager.recordFailure(credential, 'gemini', error);
            }
            throw error;
        }
    }

    // === COLETA DE DADOS DE TENDÊNCIAS ===
    async collectTrendData() {
        const trendData = { sources: [], timestamp: new Date().toISOString() };
        
        // YouTube Brasil Trending
        if (config.TREND_SOURCES.youtube_brasil.enabled) {
            try {
                const youtubeData = await this.fetchYouTubeTrends();
                trendData.sources.push({
                    platform: 'youtube_brasil',
                    data: youtubeData,
                    weight: config.TREND_SOURCES.youtube_brasil.weight
                });
            } catch (error) {
                console.warn('⚠️ Falha ao coletar trends do YouTube:', error.message);
            }
        }

        // Reddit Brasil
        if (config.TREND_SOURCES.reddit_brasil.enabled) {
            try {
                const redditData = await this.fetchRedditTrends();
                trendData.sources.push({
                    platform: 'reddit_brasil',
                    data: redditData,
                    weight: config.TREND_SOURCES.reddit_brasil.weight
                });
            } catch (error) {
                console.warn('⚠️ Falha ao coletar trends do Reddit:', error.message);
            }
        }

        return trendData;
    }

    async fetchYouTubeTrends() {
        // Implementar coleta do YouTube API se disponível
        // Por enquanto, retorna dados simulados baseados em tendências reais
        return {
            trending_topics: [
                "mistérios não resolvidos do brasil",
                "lendas urbanas brasileiras", 
                "lugares assombrados no brasil",
                "casos de desaparecimento inexplicáveis"
            ]
        };
    }

    async fetchRedditTrends() {
        const trends = [];
        
        for (const subreddit of config.TREND_SOURCES.reddit_brasil.subreddits) {
            try {
                const response = await axios.get(`https://www.reddit.com/r/${subreddit}/hot.json?limit=10`, {
                    headers: { 'User-Agent': 'VideoAutomation/2.0 Premium' },
                    timeout: 10000
                });
                
                const posts = response.data.data.children.map(child => ({
                    title: child.data.title,
                    score: child.data.score,
                    comments: child.data.num_comments,
                    subreddit: subreddit
                }));
                
                trends.push(...posts);
            } catch (error) {
                console.warn(`⚠️ Erro ao acessar r/${subreddit}:`, error.message);
            }
        }
        
        return trends.sort((a, b) => b.score - a.score).slice(0, 5);
    }

    // === SELEÇÃO DE TEMPLATE INTELIGENTE ===
    async selectTemplate(categoria) {
        console.log(`🎨 Selecionando template para categoria: ${categoria}`);
        
        const template = config.VIDEO_TEMPLATES[categoria] || config.VIDEO_TEMPLATES['misterios-brasileiros'];
        this.currentTemplate = template;
        
        console.log(`✅ Template selecionado: ${template.style}`);
        return template;
    }

    // === GERAÇÃO DE ROTEIRO OTIMIZADA ===
    async generateScript(topic) {
        console.log(`📝 Gerando roteiro para: "${topic.titulo}"`);
        const startTime = Date.now();
        
        const { model, credential } = await this.initializeGemini();
        
        const prompt = `
Crie um roteiro PROFISSIONAL e ENVOLVENTE para um vídeo sobre: "${topic.titulo}"

Categoria: ${topic.categoria}
Público-alvo: ${topic.target_audience}

Requisitos:
- Roteiro de 450-500 palavras (narração de 2-3 minutos)
- Hook forte nos primeiros 15 segundos
- 5 seções visuais distintas com timestamps
- Linguagem acessível mas cativante
- Final que incentive engajamento

Retorne APENAS um JSON válido:
{
  "script": {
    "title": "título final otimizado",
    "hook": "texto do hook (15s)",
    "main_content": "corpo principal do roteiro com timestamps [00:xx]",
    "call_to_action": "chamada final para ação",
    "total_duration": "2:30"
  },
  "image_prompts": [
    {
      "timestamp": "00:00",
      "scene": "hook visual",
      "prompt": "prompt detalhado em inglês para gerar imagem",
      "negativePrompt": "elementos a evitar"
    }
    // ... mais 4 cenas
  ]
}`;

        try {
            const result = await model.generateContent(prompt);
            const scriptData = JSON.parse(result.response.text());
            
            if (credential) {
                await credentialManager.recordUsage(credential, 'gemini', true);
            }
            
            this.metrics.processing_time.script_generation = Date.now() - startTime;
            this.metrics.api_calls++;
            
            console.log(`✅ Roteiro gerado em ${this.metrics.processing_time.script_generation}ms`);
            return scriptData;
            
        } catch (error) {
            if (credential) {
                await credentialManager.recordFailure(credential, 'gemini', error);
            }
            throw error;
        }
    }

    // === GERAÇÃO MULTI-FORMATO ===
    async generateMultiFormat(images, audio, executionPath) {
        console.log('🎬 Gerando vídeos em múltiplos formatos...');
        const videos = {};
        
        // Gerar cada formato em paralelo
        const formatPromises = Object.entries(config.OUTPUT_FORMATS).map(async ([formatName, formatConfig]) => {
            try {
                const outputPath = path.join(executionPath, `${this.executionId}_${formatName}.mp4`);
                
                const videoPath = await videoProc.createVideo({
                    images: images,
                    audio: audio,
                    output: outputPath,
                    executionId: this.executionId,
                    format: formatConfig,
                    template: this.currentTemplate
                });
                
                videos[formatName] = {
                    path: videoPath,
                    config: formatConfig,
                    size: fssync.statSync(videoPath).size
                };
                
                console.log(`✅ ${formatName}: ${path.basename(videoPath)} (${(videos[formatName].size / 1024 / 1024).toFixed(1)}MB)`);
                
            } catch (error) {
                console.error(`❌ Erro ao gerar formato ${formatName}:`, error.message);
                videos[formatName] = { error: error.message };
            }
        });
        
        await Promise.allSettled(formatPromises);
        return videos;
    }

    // === PIPELINE PRINCIPAL V2 ===
    async execute(executionId = null, options = {}) {
        this.startTime = Date.now();
        
        try {
            await this.sendDiscordNotification('🚀 Pipeline Premium v2.0 iniciado com Gemini 2.5 Flash!', false);
            
            // Configurar APIs
            await this.setupAPIs();
            
            // 1. Análise de tendências
            const selectedTopic = await this.retryWithBackoff(() => this.analyzeTrends());
            
            // 2. Configurar execução
            if (!executionId) {
                this.executionId = `exec_${Date.now()}`;
            } else {
                this.executionId = executionId;
            }
            
            const executionPath = path.join(BASE_OUTPUT_PATH, this.executionId);
            await fs.mkdir(executionPath, { recursive: true });
            
            // 3. Selecionar template
            await this.selectTemplate(selectedTopic.categoria);
            
            // 4. Gerar roteiro
            const scriptData = await this.retryWithBackoff(() => this.generateScript(selectedTopic));
            
            // 5. Gerar assets em paralelo
            const [imagesResult, audioResult] = await Promise.all([
                this.retryWithBackoff(() => imageGen.generateImages(scriptData.image_prompts, path.join(executionPath, 'images'), this.executionId)),
                this.retryWithBackoff(() => ttsGen.generateAudio(scriptData.script.main_content, executionPath, this.executionId))
            ]);
            
            // 6. Gerar vídeos multi-formato
            const videos = await this.generateMultiFormat(
                imagesResult.map(img => img.path),
                audioResult.localPath,
                executionPath
            );
            
            // 7. Salvar assets
            const storageResult = await storage.saveAllAssets({
                script: JSON.stringify(scriptData),
                topic: JSON.stringify(selectedTopic),
                images: imagesResult.map(img => img.path),
                audio: audioResult.localPath,
                videos: Object.values(videos).filter(v => v.path).map(v => v.path)
            }, this.executionId);
            
            // 8. Calcular métricas finais
            const totalTime = Date.now() - this.startTime;
            const successfulFormats = Object.values(videos).filter(v => v.path).length;
            
            // 9. Notificação final
            const statsMessage = `
📊 **Estatísticas da Execução:**
⏱️ Tempo total: ${Math.round(totalTime/1000)}s
🎯 Tópico: ${selectedTopic.titulo}
🎨 Imagens: ${imagesResult.length} (${imagesResult.map(i => i.service).join(', ')})
🎙️ TTS: ${audioResult.service} (${audioResult.quality})
🎬 Vídeos: ${successfulFormats} formatos gerados
💾 Storage: ${storageResult.metadata.storage_type}
🔥 Score viral: ${selectedTopic.viral_score}/100`;

            await this.sendDiscordNotification(
                `✅ Pipeline Premium v2.0 concluído!${statsMessage}`, 
                false
            );

            console.log('\n🎉 Pipeline Premium v2.0 executado com sucesso!');
            console.log(`📁 Arquivos salvos em: ${executionPath}`);
            console.log(`📊 Métricas: ${JSON.stringify(this.metrics, null, 2)}`);
            
            return {
                executionId: this.executionId,
                topic: selectedTopic,
                videos: videos,
                metrics: this.metrics,
                storage: storageResult
            };
            
        } catch (error) {
            console.error('❌ Pipeline Premium v2.0 falhou:', error);
            await this.sendDiscordNotification(
                `**Erro na execução ${this.executionId}:** ${error.message}\n\n🚨 Pipeline Premium v2.0 interrompido.`,
                true
            );
            throw error;
        }
    }

    // === FUNÇÕES AUXILIARES ===
    async setupAPIs() {
        console.log('🔧 Configurando APIs premium...');
        await Promise.all([
            imageGen.setupAPIs(),
            ttsGen.setupAPIs()
        ]);
    }

    async retryWithBackoff(fn, retries = 3, delay = 2000) {
        try {
            return await fn();
        } catch (error) {
            if (retries > 0 && this.isRetriableError(error)) {
                console.warn(`[RETRY] Tentando novamente em ${delay}ms... (${retries} restantes)`);
                await new Promise(res => setTimeout(res, delay));
                return this.retryWithBackoff(fn, retries - 1, delay * 2);
            }
            throw error;
        }
    }

    isRetriableError(error) {
        const message = (error.message || '').toLowerCase();
        const retriableTerms = ['timeout', 'rate limit', '429', '503', 'temporarily unavailable', 'quota'];
        return retriableTerms.some(term => message.includes(term));
    }

    async sendDiscordNotification(message, isError = false) {
        const embed = {
            title: isError ? '❌ Pipeline Premium v2.0 Falhou!' : '✅ Pipeline Premium v2.0',
            description: `${message}\n\n⚡ **Gemini 2.5 Flash + Multi-API**`,
            color: isError ? 15158332 : 3066993,
            timestamp: new Date().toISOString(),
            footer: { text: 'novo3 - Pipeline Premium v2.0' }
        };
        
        try {
            if (DISCORD_WEBHOOK_URL) {
                await axios.post(DISCORD_WEBHOOK_URL, { embeds: [embed] });
            }
        } catch (error) {
            console.error('Erro ao enviar notificação Discord:', error.message);
        }
    }
}

// === EXECUÇÃO PRINCIPAL ===
if (require.main === module) {
    const args = process.argv.slice(2);
    const executionId = args[0] || null;
    
    const options = {
        language: args.includes('--lang-en') ? 'en' : 'pt',
        voice: args.includes('--voice-male') ? 'male' : 'female',
        debug: args.includes('--debug')
    };
    
    const pipeline = new PipelinePremiumV2();
    
    pipeline.execute(executionId, options)
        .then(result => {
            console.log('\n🎯 Resultado:', JSON.stringify(result, null, 2));
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Erro fatal:', error);
            process.exit(1);
        });
}

module.exports = PipelinePremiumV2;