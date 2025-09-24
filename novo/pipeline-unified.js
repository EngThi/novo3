#!/usr/bin/env node
/**
 * PIPELINE UNIFICADO v3.0 - Sistema Inteligente e Otimizado
 * Consolida todos os pipelines em uma interface única com detecção automática de capacidades
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

    // === GEMINI 2.5 FLASH OTIMIZADO ===
    async initializeGemini() {
        try {
            const credential = await this.credentialManager.getNextCredential('gemini');
            const genAI = new GoogleGenerativeAI(credential.api_key);
            
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: {
                    temperature: 0.8,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 8192,
                    responseMimeType: "application/json"
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
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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
        let script = await this.checkCache('script', { topic });
        if (!script) {
            script = await this.generateScript(topic);
            await this.saveCache('script', { topic }, script);
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
        
        const prompt = `
Analise tendências atuais e gere um tópico viral para YouTube sobre mistérios brasileiros.

Retorne JSON:
{
  "titulo": "título otimizado para SEO",
  "categoria": "misterios-brasileiros",
  "viral_score": 85,
  "target_audience": "descrição do público",
  "hashtags": ["#misterio", "#brasil", "#viral"]
}`;
        
        const result = await model.generateContent(prompt);
        const topic = JSON.parse(result.response.text());
        
        if (credential) {
            await this.credentialManager.recordUsage(credential, 'gemini', true);
        }
        
        this.metrics.api_calls++;
        return topic;
    }
    
    async generateScript(topic) {
        const { model, credential } = await this.initializeGemini();
        
        const prompt = `
Crie um roteiro envolvente para: "${topic.titulo}"

Retorne JSON:
{
  "content": "roteiro completo com timestamps [00:xx]",
  "duration": "2:30",
  "image_prompts": [
    {"prompt": "detailed English prompt", "negativePrompt": "things to avoid"}
  ]
}`;
        
        const result = await model.generateContent(prompt);
        const script = JSON.parse(result.response.text());
        
        if (credential) {
            await this.credentialManager.recordUsage(credential, 'gemini', true);
        }
        
        this.metrics.api_calls++;
        return script;
    }
    
    async generateImages(imageGenerator, script, executionPath) {
        const imageDir = path.join(executionPath, 'images');
        await fs.mkdir(imageDir, { recursive: true });
        
        if (this.mode.includes('premium')) {
            const generator = new imageGenerator();
            const images = await generator.generateImages(script.image_prompts, imageDir, path.basename(executionPath));
            return {
                paths: images.map(img => img.path),
                service: images[0]?.service || 'premium',
                count: images.length
            };
        } else {
            // Usar versão free
            const generator = new imageGenerator();
            const images = await generator.generateImages(script.image_prompts, imageDir, path.basename(executionPath));
            return {
                paths: images.localPaths || images.map(img => img.path),
                service: 'free',
                count: images.length
            };
        }
    }
    
    async generateAudio(ttsGenerator, script, executionPath, executionId) {
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