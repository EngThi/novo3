#!/usr/bin/env node
/**
 * PIPELINE UNIFICADO v3.0 - Sistema Inteligente e Otimizado
 * Consolida todos os pipelines em uma interface única com detecção automática de capacidades
 * VERSÃO CORRIGIDA - Parser JSON robusto
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { google } = require('googleapis');
const fs = require('fs').promises;
const fssync = require('fs');
const path = require('path');
const axios = require('axios');

// Módulos unificados
const CredentialManager = require('./modules/credential-manager');
const PipelineStateManager = require('./stateManager');

class UnifiedPipeline {
    constructor(options = {}) {
        this.mode = options.mode || 'auto'; // auto, free, premium, premium-v2
        this.credentialManager = new CredentialManager();
        this.capabilities = {
            gemini_tts: false,
            nano_banana: false,
            huggingface: false,
            local_tts: false,
            local_image: false
        };
        
        this.config = {
            output_path: 'novo/output',
            temp_path: 'novo/temp',
            cache_path: 'novo/cache',
            default_voice: process.env.TTS_VOICE_PRIMARY || 'Kore',
            default_language: process.env.DEFAULT_TTS_LANGUAGE || 'pt-BR'
        };
        
        this.metrics = {
            start_time: null,
            api_calls: 0,
            cache_hits: 0,
            errors: 0,
            costs: 0
        };
        
        this.logger = new PipelineLogger();
    }

    // === PARSER JSON ROBUSTO ===
    parseJSONFromResponse(responseText) {
        try {
            // Tentar parsing direto primeiro
            return JSON.parse(responseText);
        } catch (error) {
            // Se falhar, tentar extrair JSON do texto
            try {
                // Remover possível markdown
                let cleanText = responseText.replace(/```json/g, '').replace(/```/g, '');
                
                // Procurar por { ... } no texto
                const jsonMatch = cleanText.match(/{[\s\S]*}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
                
                // Se não encontrou JSON válido, criar estrutura padrão
                console.warn('⚠️ Não foi possível extrair JSON, usando fallback...');
                
                // Extrair informações básicas do texto
                const lines = responseText.split('\n');
                const title = lines.find(line => line.includes('título') || line.includes('Título') || line.length > 20)?.replace(/[^\w\sáéíóúâêîôûãõç]/g, '') || 'Mistério Brasileiro Inexplicável';
                
                return {
                    titulo: title.substring(0, 80),
                    categoria: 'misterios-brasileiros',
                    viral_score: Math.floor(Math.random() * 20) + 70,
                    target_audience: 'Pessoas interessadas em mistérios e histórias brasileiras',
                    hashtags: ['#misterio', '#brasil', '#inexplicavel']
                };
                
            } catch (fallbackError) {
                console.error('❌ Erro crítico no parser JSON:', fallbackError.message);
                throw new Error(`Falha ao processar resposta do Gemini: ${responseText.substring(0, 200)}...`);
            }
        }
    }

    // === DETECÇÃO AUTOMÁTICA DE CAPACIDADES ===
    async detectCapabilities() {
        console.log('🔍 Detectando capacidades disponíveis...');
        
        // Detectar Gemini APIs
        try {
            const geminiCreds = await this.credentialManager.getNextCredential('gemini');
            this.capabilities.gemini_tts = true;
            console.log('✅ Gemini TTS (Premium)');
        } catch {
            if (process.env.GEMINI_API_KEY) {
                this.capabilities.gemini_tts = true;
                console.log('✅ Gemini TTS (Environment)');
            } else {
                console.log('❌ Gemini TTS não disponível');
            }
        }
        
        // Detectar Nano Banana
        this.capabilities.nano_banana = !!(process.env.NANO_BANANA_API_KEY || process.env.NANO_BANANA_FAL_KEY);
        console.log(`${this.capabilities.nano_banana ? '✅' : '❌'} Nano Banana API`);
        
        // Detectar Hugging Face
        this.capabilities.huggingface = !!(process.env.HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_PRO_KEY);
        console.log(`${this.capabilities.huggingface ? '✅' : '❌'} Hugging Face APIs`);
        
        // Detectar ferramentas locais
        try {
            const { exec } = require('child_process');
            const util = require('util');
            const execPromise = util.promisify(exec);
            
            await execPromise('which ffmpeg');
            await execPromise('which python3');
            this.capabilities.local_tts = true;
            this.capabilities.local_image = true;
            console.log('✅ Ferramentas locais (FFmpeg, Python)');
        } catch {
            console.log('❌ Algumas ferramentas locais não disponíveis');
        }
        
        // Selecionar modo automaticamente
        if (this.mode === 'auto') {
            this.mode = this.selectOptimalMode();
            console.log(`🎯 Modo selecionado automaticamente: ${this.mode.toUpperCase()}`);
        }
        
        return this.capabilities;
    }
    
    selectOptimalMode() {
        if (this.capabilities.gemini_tts && this.capabilities.nano_banana && this.capabilities.huggingface) {
            return 'premium-v2'; // Melhor qualidade
        } else if (this.capabilities.gemini_tts && (this.capabilities.nano_banana || this.capabilities.huggingface)) {
            return 'premium'; // Qualidade alta
        } else if (this.capabilities.gemini_tts) {
            return 'standard'; // Qualidade boa
        } else {
            return 'free'; // Apenas serviços gratuitos
        }
    }

    // === CARREGAMENTO DINÂMICO DE MÓDULOS ===
    async loadModules() {
        const modules = {};
        
        // Carregar módulo de imagem baseado na capacidade
        if (this.capabilities.nano_banana || this.capabilities.huggingface) {
            modules.imageGenerator = require('./modules/image-generator-premium');
            console.log('📸 Carregado: Image Generator Premium');
        } else {
            modules.imageGenerator = require('./modules/image-generator-free');
            console.log('📸 Carregado: Image Generator Free');
        }
        
        // Carregar módulo de TTS baseado na capacidade
        if (this.capabilities.gemini_tts && this.mode.includes('premium')) {
            modules.ttsGenerator = require('./modules/gemini-tts-premium');
            console.log('🎙️ Carregado: Gemini TTS Premium');
        } else if (this.capabilities.huggingface) {
            modules.ttsGenerator = require('./modules/tts-generator-premium');
            console.log('🎙️ Carregado: TTS Premium (Hugging Face)');
        } else {
            modules.ttsGenerator = require('./modules/tts-generator-free');
            console.log('🎙️ Carregado: TTS Free');
        }
        
        // Módulos sempre necessários
        modules.videoProcessor = require('./modules/video-processor-free');
        modules.storageManager = require('./modules/storage-manager-free');
        
        console.log('✅ Todos os módulos carregados dinamicamente');
        return modules;
    }

    // === SISTEMA DE CACHE INTELIGENTE ===
    async checkCache(operation, params) {
        const cacheKey = this.generateCacheKey(operation, params);
        const cachePath = path.join(this.config.cache_path, `${cacheKey}.json`);
        
        try {
            if (fssync.existsSync(cachePath)) {
                const cached = JSON.parse(await fs.readFile(cachePath, 'utf8'));
                const age = Date.now() - cached.timestamp;
                
                // Cache válido por 24h para scripts, 7d para assets
                const maxAge = operation === 'script' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
                
                if (age < maxAge) {
                    this.metrics.cache_hits++;
                    console.log(`💾 Cache hit: ${operation}`);
                    return cached.data;
                }
            }
        } catch (error) {
            console.warn('⚠️ Erro ao verificar cache:', error.message);
        }
        
        return null;
    }
    
    async saveCache(operation, params, data) {
        try {
            const cacheKey = this.generateCacheKey(operation, params);
            const cachePath = path.join(this.config.cache_path, `${cacheKey}.json`);
            
            await fs.mkdir(this.config.cache_path, { recursive: true });
            await fs.writeFile(cachePath, JSON.stringify({
                timestamp: Date.now(),
                operation,
                params,
                data
            }));
        } catch (error) {
            console.warn('⚠️ Erro ao salvar cache:', error.message);
        }
    }
    
    generateCacheKey(operation, params) {
        const crypto = require('crypto');
        const keyData = JSON.stringify({ operation, ...params });
        return crypto.createHash('md5').update(keyData).digest('hex');
    }

    // === GEMINI 2.5 FLASH OTIMIZADO COM JSON FORÇADO ===
    async initializeGemini() {
        try {
            const credential = await this.credentialManager.getNextCredential('gemini');
            const genAI = new GoogleGenerativeAI(credential.api_key);
            
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 4096,
                    responseMimeType: "application/json"  // FORÇAR JSON
                },
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" }
                ]
            });
            
            return { model, credential };
        } catch (error) {
            if (process.env.GEMINI_API_KEY) {
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ 
                    model: "gemini-2.5-flash",
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                });
                return { model, credential: null };
            }
            throw error;
        }
    }

    // === EXECUÇÃO PRINCIPAL UNIFICADA ===
    async execute(options = {}) {
        this.metrics.start_time = Date.now();
        
        try {
            // 1. Detectar capacidades
            await this.detectCapabilities();
            
            // 2. Carregar módulos dinamicamente
            const modules = await this.loadModules();
            
            // 3. Configurar diretórios
            await this.setupDirectories();
            
            // 4. Executar pipeline baseado no modo
            const result = await this.executePipeline(modules, options);
            
            // 5. Logs finais e cleanup
            await this.finalize(result);
            
            return result;
            
        } catch (error) {
            await this.handleError(error);
            throw error;
        }
    }
    
    async executePipeline(modules, options) {
        const executionId = options.executionId || `exec_${Date.now()}`;
        const executionPath = path.join(this.config.output_path, executionId);
        
        console.log(`🚀 Executando pipeline no modo: ${this.mode.toUpperCase()}`);
        console.log(`📁 Diretório de execução: ${executionPath}`);
        
        // Etapa 1: Descobrir conteúdo (com cache)
        let topic = await this.checkCache('topic_discovery', { date: new Date().toDateString() });
        if (!topic) {
            topic = await this.discoverContent();
            await this.saveCache('topic_discovery', { date: new Date().toDateString() }, topic);
        }
        
        // Etapa 2: Gerar roteiro (com cache)
        let script = await this.checkCache('script', { topic: topic.titulo });
        if (!script) {
            script = await this.generateScript(topic);
            await this.saveCache('script', { topic: topic.titulo }, script);
        }
        
        // Etapa 3: Gerar assets em paralelo
        const [images, audio] = await Promise.all([
            this.generateImages(modules.imageGenerator, script, executionPath),
            this.generateAudio(modules.ttsGenerator, script, executionPath, executionId)
        ]);
        
        // Etapa 4: Processar vídeo
        const video = await modules.videoProcessor.createVideo({
            images: images.paths,
            audio: audio.path,
            output: path.join(executionPath, `${executionId}_final.mp4`),
            executionId
        });
        
        // Etapa 5: Armazenamento
        const storage = await modules.storageManager.saveAllAssets({
            script: JSON.stringify(script),
            images: images.paths,
            audio: audio.path,
            video: video
        }, executionId);
        
        return {
            executionId,
            topic,
            script,
            images,
            audio,
            video,
            storage,
            mode: this.mode,
            metrics: this.getMetrics()
        };
    }
    
    async setupDirectories() {
        const dirs = [this.config.output_path, this.config.temp_path, this.config.cache_path];
        await Promise.all(dirs.map(dir => fs.mkdir(dir, { recursive: true })));
    }
    
    async discoverContent() {
        const { model, credential } = await this.initializeGemini();
        
        // PROMPT COM SCHEMA JSON ESPECÍFICO
        const prompt = `Você deve retornar APENAS um JSON válido seguindo exatamente esta estrutura:

{
  "titulo": "string - título otimizado para YouTube sobre mistérios brasileiros",
  "categoria": "misterios-brasileiros",
  "viral_score": "number - score de 70 a 95",
  "target_audience": "string - descrição do público alvo",
  "hashtags": ["#misterio", "#brasil", "#viral"]
}

Gere um tópico sobre mistérios, lendas ou casos inexplicáveis do Brasil. 
IMPORTANTE: Retorne APENAS o JSON, sem texto adicional, explicações ou markdown.`;
        
        try {
            const result = await model.generateContent(prompt);
            const responseText = result.response.text().trim();
            console.log('📝 Resposta bruta do Gemini:', responseText.substring(0, 200) + '...');
            
            const topic = this.parseJSONFromResponse(responseText);
            
            // Validar campos obrigatórios
            if (!topic.titulo || !topic.categoria) {
                throw new Error('JSON retornado não contém campos obrigatórios');
            }
            
            if (credential) {
                await this.credentialManager.recordUsage(credential, 'gemini', true);
            }
            
            this.metrics.api_calls++;
            console.log('✅ Tópico descoberto:', topic.titulo);
            return topic;
            
        } catch (error) {
            if (credential) {
                await this.credentialManager.recordFailure(credential, 'gemini', error);
            }
            
            // Fallback: usar tópico padrão
            console.warn('⚠️ Usando tópico de fallback devido ao erro:', error.message);
            return {
                titulo: 'O Mistério da Pedra do Ingá: Códigos Ancestrais Inexplicáveis',
                categoria: 'misterios-brasileiros',
                viral_score: 85,
                target_audience: 'Pessoas interessadas em mistérios e arqueologia brasileira',
                hashtags: ['#misterio', '#brasil', '#arqueologia', '#inexplicavel']
            };
        }
    }
    
    async generateScript(topic) {
        const { model, credential } = await this.initializeGemini();
        
        const prompt = `Você deve retornar APENAS um JSON válido seguindo exatamente esta estrutura:

{
  "content": "string - roteiro completo de 400-500 palavras com timestamps [00:15], [00:45] etc",
  "duration": "string - duração estimada como 2:30",
  "image_prompts": [
    {
      "prompt": "string - prompt detalhado em inglês para gerar imagem",
      "negativePrompt": "string - elementos a evitar na imagem"
    }
  ]
}

Crie um roteiro envolvente para o vídeo: "${topic.titulo}"
Categoria: ${topic.categoria}
Público: ${topic.target_audience}

IMPORTANTE: 
- Roteiro deve ter exatamente 5 cenas com timestamps
- Prompts de imagem em inglês, safe for work
- Retorne APENAS o JSON, sem explicações ou markdown`;
        
        try {
            const result = await model.generateContent(prompt);
            const responseText = result.response.text().trim();
            console.log('📝 Resposta script bruta:', responseText.substring(0, 200) + '...');
            
            const script = this.parseJSONFromResponse(responseText);
            
            // Validar script
            if (!script.content || !script.image_prompts) {
                throw new Error('Script JSON inválido');
            }
            
            // Garantir 5 image prompts
            if (!Array.isArray(script.image_prompts) || script.image_prompts.length === 0) {
                script.image_prompts = [
                    { prompt: "mysterious ancient stone with symbols in Brazilian forest", negativePrompt: "people, text, modern objects" },
                    { prompt: "dense green Brazilian rainforest with mist and shadows", negativePrompt: "people, buildings, text" },
                    { prompt: "ancient petroglyphs carved on dark stone surface", negativePrompt: "people, modern elements" },
                    { prompt: "mysterious cave entrance hidden in Brazilian landscape", negativePrompt: "people, artificial lights" },
                    { prompt: "sunset over Brazilian wilderness with mysterious atmosphere", negativePrompt: "people, cities, text" }
                ];
            }
            
            if (credential) {
                await this.credentialManager.recordUsage(credential, 'gemini', true);
            }
            
            this.metrics.api_calls++;
            console.log('✅ Roteiro gerado com', script.image_prompts.length, 'prompts de imagem');
            return script;
            
        } catch (error) {
            if (credential) {
                await this.credentialManager.recordFailure(credential, 'gemini', error);
            }
            
            // Script de fallback
            console.warn('⚠️ Usando roteiro de fallback:', error.message);
            return {
                content: `[00:00] Bem-vindos a mais um mistério inexplicável do Brasil. [00:15] Hoje vamos explorar ${topic.titulo}. [00:30] Esta é uma história que desafia explicações científicas. [00:45] Localizada em uma região remota, esta descoberta intriga pesquisadores. [01:00] Os habitantes locais contam histórias fascinantes sobre este local. [01:15] Evidências sugerem que algo extraordinário aconteceu aqui. [01:30] Até hoje, nenhuma explicação convincente foi encontrada. [01:45] O que vocês acham deste mistério? Deixem sua opinião nos comentários!`,
                duration: "2:00",
                image_prompts: [
                    { prompt: "mysterious ancient Brazilian location with enigmatic atmosphere", negativePrompt: "people, text, modern objects" },
                    { prompt: "dense green Brazilian forest with mysterious shadows", negativePrompt: "people, buildings" },
                    { prompt: "ancient stone formations in Brazilian landscape", negativePrompt: "people, modern elements" },
                    { prompt: "mysterious cave or structure in Brazilian wilderness", negativePrompt: "people, artificial lights" },
                    { prompt: "Brazilian sunset landscape with mysterious mood", negativePrompt: "people, cities, text" }
                ]
            };
        }
    }
    
    async generateImages(imageGenerator, script, executionPath) {
        const imageDir = path.join(executionPath, 'images');
        await fs.mkdir(imageDir, { recursive: true });
        
        try {
            if (this.mode.includes('premium')) {
                const generator = new imageGenerator();
                const images = await generator.generateImages(script.image_prompts, imageDir, path.basename(executionPath));
                return {
                    paths: images.map(img => img.path || img.localPath),
                    service: images[0]?.service || 'premium',
                    count: images.length
                };
            } else {
                // Usar versão free
                const generator = new imageGenerator();
                const images = await generator.generateImages(script.image_prompts, imageDir, path.basename(executionPath));
                return {
                    paths: images.localPaths || images.map(img => img.path || img.localPath),
                    service: 'free',
                    count: Array.isArray(images) ? images.length : (images.localPaths?.length || 0)
                };
            }
        } catch (error) {
            console.error('❌ Erro na geração de imagens:', error.message);
            throw error;
        }
    }
    
    async generateAudio(ttsGenerator, script, executionPath, executionId) {
        try {
            if (this.capabilities.gemini_tts && this.mode.includes('premium')) {
                const GeminiTTS = require('./modules/gemini-tts-premium');
                const tts = new GeminiTTS({ voice: this.config.default_voice });
                
                const result = await tts.generateFromScript(
                    script.content, 
                    script.categoria || 'misterios-brasileiros', 
                    executionPath
                );
                
                return {
                    path: result.localPath,
                    service: 'gemini-tts-premium',
                    voice: result.voice,
                    duration: result.duration,
                    quality: result.quality
                };
            } else {
                // Fallback para outros sistemas
                const generator = new ttsGenerator();
                const result = await generator.generateAudio(script.content, executionPath, executionId);
                return result;
            }
        } catch (error) {
            console.error('❌ Erro na geração de áudio:', error.message);
            throw error;
        }
    }
    
    getMetrics() {
        const totalTime = Date.now() - this.metrics.start_time;
        return {
            ...this.metrics,
            total_time_seconds: Math.round(totalTime / 1000),
            mode_used: this.mode,
            capabilities: this.capabilities
        };
    }
    
    async finalize(result) {
        const metrics = this.getMetrics();
        
        console.log('\n🎉 PIPELINE CONCLUÍDO!');
        console.log(`⚡ Modo: ${this.mode.toUpperCase()}`);
        console.log(`⏱️ Tempo: ${metrics.total_time_seconds}s`);
        console.log(`🎯 API calls: ${metrics.api_calls}`);
        console.log(`💾 Cache hits: ${metrics.cache_hits}`);
        console.log(`🎬 Vídeo: ${path.basename(result.video)}`);
        
        // Salvar log da execução
        await this.logger.logExecution({
            executionId: result.executionId,
            mode: this.mode,
            metrics,
            result
        });
        
        // Limpeza automática
        await this.cleanup();
    }
    
    async cleanup() {
        try {
            // Limpar arquivos temporários antigos (7+ dias)
            const tempFiles = await fs.readdir(this.config.temp_path).catch(() => []);
            const now = Date.now();
            
            for (const file of tempFiles) {
                const filePath = path.join(this.config.temp_path, file);
                const stats = await fs.stat(filePath).catch(() => null);
                
                if (stats && (now - stats.mtime.getTime()) > 7 * 24 * 60 * 60 * 1000) {
                    await fs.unlink(filePath).catch(() => {});
                }
            }
            
            console.log('🧹 Limpeza automática concluída');
        } catch (error) {
            console.warn('⚠️ Erro na limpeza:', error.message);
        }
    }
    
    async handleError(error) {
        this.metrics.errors++;
        await this.logger.logError(error, this.getMetrics());
        console.error('💥 Erro no pipeline:', error.message);
        
        // Notificação de erro via Discord se configurado
        if (process.env.DISCORD_WEBHOOK_URL) {
            try {
                await axios.post(process.env.DISCORD_WEBHOOK_URL, {
                    embeds: [{
                        title: '❌ Pipeline Erro',
                        description: `**Erro:** ${error.message}\n**Modo:** ${this.mode}\n**Tempo:** ${this.getMetrics().total_time_seconds}s`,
                        color: 15158332,
                        timestamp: new Date().toISOString()
                    }]
                });
            } catch (discordError) {
                console.warn('⚠️ Erro ao notificar Discord:', discordError.message);
            }
        }
    }
}

// === SISTEMA DE LOGS CENTRALIZADO ===
class PipelineLogger {
    constructor() {
        this.logPath = './novo/logs';
        this.ensureLogDir();
    }
    
    async ensureLogDir() {
        try {
            await fs.mkdir(this.logPath, { recursive: true });
        } catch (error) {
            console.warn('⚠️ Não foi possível criar diretório de logs');
        }
    }
    
    async logExecution(data) {
        const logFile = path.join(this.logPath, `execution_${new Date().toISOString().split('T')[0]}.json`);
        
        try {
            let logs = [];
            try {
                const existingLogs = await fs.readFile(logFile, 'utf8');
                logs = JSON.parse(existingLogs);
            } catch {}
            
            logs.push({
                timestamp: new Date().toISOString(),
                ...data
            });
            
            await fs.writeFile(logFile, JSON.stringify(logs, null, 2));
        } catch (error) {
            console.warn('⚠️ Erro ao salvar log:', error.message);
        }
    }
    
    async logError(error, metrics) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
            metrics
        };
        
        const errorFile = path.join(this.logPath, 'errors.json');
        
        try {
            let errors = [];
            try {
                const existingErrors = await fs.readFile(errorFile, 'utf8');
                errors = JSON.parse(existingErrors);
            } catch {}
            
            errors.push(errorLog);
            
            // Manter apenas últimos 100 erros
            if (errors.length > 100) {
                errors = errors.slice(-100);
            }
            
            await fs.writeFile(errorFile, JSON.stringify(errors, null, 2));
        } catch (logError) {
            console.warn('⚠️ Erro ao salvar log de erro:', logError.message);
        }
    }
}

// === INTERFACE CLI INTELIGENTE ===
if (require.main === module) {
    const args = process.argv.slice(2);
    
    // Parse de argumentos
    const options = {
        mode: 'auto',
        executionId: null,
        voice: process.env.TTS_VOICE_PRIMARY || 'Kore',
        language: 'pt-BR',
        debug: false
    };
    
    // Processar argumentos
    args.forEach(arg => {
        if (arg.startsWith('exec_')) options.executionId = arg;
        if (arg === '--mode=free') options.mode = 'free';
        if (arg === '--mode=premium') options.mode = 'premium';
        if (arg === '--mode=premium-v2') options.mode = 'premium-v2';
        if (arg.startsWith('--voice=')) options.voice = arg.split('=')[1];
        if (arg.startsWith('--lang=')) options.language = arg.split('=')[1];
        if (arg === '--debug') options.debug = true;
    });
    
    // Executar pipeline
    const pipeline = new UnifiedPipeline(options);
    
    pipeline.execute(options)
        .then(result => {
            console.log('\n✅ SUCESSO:', JSON.stringify({
                executionId: result.executionId,
                mode: result.mode,
                video: path.basename(result.video),
                duration: result.metrics.total_time_seconds + 's'
            }, null, 2));
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 ERRO:', error.message);
            process.exit(1);
        });
}

module.exports = UnifiedPipeline;