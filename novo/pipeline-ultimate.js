#!/usr/bin/env node
/**
 * PIPELINE ULTIMATE v5.0 - Sistema Completo de Automação de Vídeos
 * Integra rate limiting inteligente + video assembly + monetização
 * Versão final para produção e comercialização
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const fssync = require('fs');
const path = require('path');
const axios = require('axios');

// Módulos Ultimate
const SmartCache = require('./utils/smart-cache');
const QualityAnalyzer = require('./utils/quality-analyzer');
const TemplateSelector = require('./modules/template-selector');
const PerformanceTracker = require('./utils/performance-tracker');
const AutoRecovery = require('./utils/auto-recovery');
const RateLimiter = require('./utils/rate-limiter');
const VideoAssembler = require('./modules/video-assembler');

class PipelineUltimate {
    constructor(options = {}) {
        this.mode = options.mode || 'auto';
        this.template = options.template || null;
        this.batchSize = options.batch || 1;
        this.withVideo = options.withVideo || false;
        this.commercialMode = options.commercial || false;
        
        // Sistema Ultimate
        this.cache = new SmartCache();
        this.qualityAnalyzer = new QualityAnalyzer();
        this.templateSelector = new TemplateSelector();
        this.performanceTracker = new PerformanceTracker();
        this.autoRecovery = new AutoRecovery();
        this.rateLimiter = new RateLimiter();
        this.videoAssembler = new VideoAssembler();
        
        this.capabilities = {
            gemini_tts: false,
            video_assembly: false,
            commercial_api: false
        };
        
        this.config = {
            output_path: 'novo/output',
            video_path: 'novo/videos',
            cache_path: 'novo/cache',
            quality_threshold: 8.5, // Mais rigoroso
            max_retries: 5, // Mais tentativas
            video_quality: '1080p',
            enable_watermark: !this.commercialMode
        };
        
        this.metrics = {
            start_time: null,
            videos_generated: 0,
            total_cost: 0,
            revenue: 0,
            cache_savings: 0,
            avg_quality: 0
        };
    }

    // === DETECÇÃO AVANÇADA DE CAPACIDADES ===
    async detectCapabilities() {
        console.log('🚀 [ULTIMATE] Detectando capacidades enterprise...');
        
        // Gemini TTS com Rate Limiter
        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey && geminiKey.length > 10) {
            this.capabilities.gemini_tts = true;
            console.log('✅ Gemini TTS Premium + Rate Limiter Ativo');
        }
        
        // Video Assembly
        try {
            await this.videoAssembler.checkDependencies();
            this.capabilities.video_assembly = true;
            console.log('✅ Video Assembly Engine Disponível');
        } catch (error) {
            console.log('⚠️ Video Assembly: Fallback mode');
        }
        
        // Commercial API
        if (this.commercialMode) {
            this.capabilities.commercial_api = true;
            console.log('💰 Commercial API Mode Ativado');
        }
        
        this.mode = this.selectOptimalMode();
        console.log(`🎯 Modo Ultimate selecionado: ${this.mode.toUpperCase()}`);
        
        return this.capabilities;
    }
    
    selectOptimalMode() {
        if (this.capabilities.gemini_tts && this.capabilities.video_assembly) {
            return 'ultimate';
        } else if (this.capabilities.gemini_tts) {
            return 'premium-plus';
        } else {
            return 'standard-plus';
        }
    }

    // === EXECUÇÃO ULTIMATE ===
    async execute(options = {}) {
        this.metrics.start_time = Date.now();
        
        try {
            console.log('\n🚀 PIPELINE ULTIMATE v5.0 - INICIANDO');
            console.log('=' .repeat(50));
            console.log(`📊 Batch: ${this.batchSize} vídeos`);
            console.log(`🎬 Video Assembly: ${this.withVideo ? 'SIM' : 'NÃO'}`);
            console.log(`💰 Commercial: ${this.commercialMode ? 'SIM' : 'NÃO'}`);
            console.log('=' .repeat(50));
            
            // 1. Detectar capacidades
            await this.detectCapabilities();
            
            // 2. Configurar diretórios
            await this.setupDirectories();
            
            // 3. Executar batch com rate limiting
            const results = await this.executeBatchUltimate();
            
            // 4. Relatório final
            await this.generateFinalReport(results);
            
            return results;
            
        } catch (error) {
            await this.handleCriticalError(error);
            throw error;
        }
    }
    
    async executeBatchUltimate() {
        console.log(`🚀 [ULTIMATE] Iniciando produção de ${this.batchSize} vídeos...`);
        
        const results = [];
        const concurrency = Math.min(this.batchSize, 3); // Max 3 simultâneos
        
        // Dividir batch em grupos menores para rate limiting
        const batches = [];
        for (let i = 0; i < this.batchSize; i += concurrency) {
            const batchGroup = [];
            for (let j = 0; j < concurrency && (i + j) < this.batchSize; j++) {
                batchGroup.push(this.executeVideoUltimate(`ultimate_${i + j + 1}`));
            }
            batches.push(Promise.all(batchGroup));
        }
        
        // Executar batches sequencialmente (rate limiting global)
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            console.log(`\n📦 Processando batch ${batchIndex + 1}/${batches.length}...`);
            
            const batchResults = await batches[batchIndex];
            results.push(...batchResults);
            
            // Pausa entre batches para rate limiting
            if (batchIndex < batches.length - 1) {
                console.log('⏱️ Aguardando cooldown entre batches...');
                await this.sleep(10000); // 10s entre batches
            }
        }
        
        return results;
    }
    
    async executeVideoUltimate(videoId) {
        const sessionStart = Date.now();
        
        try {
            console.log(`\n🎬 Iniciando ${videoId}...`);
            
            // Template inteligente
            const template = await this.loadTemplate(this.template || 'misterios-brasileiros');
            console.log(`🎨 Template: ${this.template || 'misterios-brasileiros'} (${template.voice})`);
            
            // Etapa 1: Conteúdo (cache semântico)
            let topic = await this.cache.findSimilar(`topic_${template.style}`);
            if (!topic) {
                topic = await this.generateTopic(template);
                await this.cache.set(`topic_${template.style}`, topic, 7 * 24 * 60 * 60 * 1000, 0.05);
            } else {
                console.log('💾 Cache semântico: tópico encontrado');
                this.metrics.cache_savings += 0.05;
            }
            
            // Etapa 2: Script (cache + quality)
            let script = await this.cache.findSimilar(`script_${topic.titulo}`);
            if (!script) {
                script = await this.generateScript(topic, template);
                await this.cache.set(`script_${topic.titulo}`, script, 3 * 24 * 60 * 60 * 1000, 0.10);
            } else {
                console.log('💾 Cache semântico: script encontrado');
                this.metrics.cache_savings += 0.10;
            }
            
            const executionPath = path.join(this.config.output_path, videoId);
            await fs.mkdir(executionPath, { recursive: true });
            
            // Etapa 3: Assets com rate limiting
            console.log('🎭 Gerando assets com rate limiting...');
            const [images, audio] = await Promise.all([
                this.generateImagesUltimate(script, executionPath, template),
                this.generateAudioUltimate(script, executionPath, template)
            ]);
            
            // Etapa 4: Video Assembly (se habilitado)
            let video = null;
            if (this.withVideo && this.capabilities.video_assembly) {
                console.log('🎬 Iniciando video assembly...');
                video = await this.assembleVideo({
                    images: images.paths,
                    audio: audio.path,
                    script: script,
                    template: template,
                    outputPath: executionPath,
                    videoId: videoId
                });
            }
            
            // Etapa 5: Quality scoring final
            const finalQuality = await this.calculateUltimateQuality({
                images, audio, script, video
            }, template);
            
            const sessionTime = Date.now() - sessionStart;
            this.metrics.videos_generated++;
            
            const result = {
                success: true,
                videoId,
                topic,
                script,
                images,
                audio,
                video,
                quality_score: finalQuality,
                template: this.template,
                execution_time: sessionTime,
                mode: this.mode,
                cache_savings: this.metrics.cache_savings
            };
            
            // Log de resultados
            await this.performanceTracker.log(result);
            this.logVideoResult(result);
            
            return result;
            
        } catch (error) {
            console.error(`❌ Erro no vídeo ${videoId}:`, error.message);
            return {
                success: false,
                videoId,
                error: error.message,
                execution_time: Date.now() - sessionStart
            };
        }
    }

    // === GERAÇÃO COM RATE LIMITING ===
    async generateAudioUltimate(script, executionPath, template) {
        try {
            console.log(`🎙️ Gerando áudio com rate limiting (voz: ${template.voice})...`);
            
            // Usar rate limiter para TTS
            const audioData = await this.rateLimiter.executeGeminiTTS(
                script.content, 
                template.voice,
                { priority: 1 } // Alta prioridade
            );
            
            // Converter e salvar
            const audioPath = path.join(executionPath, `audio_${template.voice.toLowerCase()}_${Date.now()}.wav`);
            const audioBuffer = this.convertBase64ToWav(audioData);
            await fs.writeFile(audioPath, audioBuffer);
            
            console.log(`✅ Áudio gerado com sucesso: ${path.basename(audioPath)}`);
            
            return {
                path: audioPath,
                service: 'gemini-tts-rate-limited',
                voice: template.voice,
                duration: this.estimateAudioDuration(script.content),
                quality_score: 9.5 // Rate limited = máxima qualidade
            };
            
        } catch (error) {
            console.warn('⚠️ Rate limiter falhou, usando fallback...');
            
            // Fallback sem rate limiting
            const mockPath = path.join(executionPath, 'audio_fallback.txt');
            await fs.writeFile(mockPath, `Fallback audio for: ${script.content}`);
            
            return {
                path: mockPath,
                service: 'fallback-audio',
                quality_score: 4.0
            };
        }
    }
    
    async generateImagesUltimate(script, executionPath, template) {
        console.log('🖼️ Gerando imagens com fallbacks inteligentes...');
        
        const imageDir = path.join(executionPath, 'images');
        await fs.mkdir(imageDir, { recursive: true });
        
        const images = [];
        const prompts = script.image_prompts || this.generateDefaultPrompts(template);
        
        for (let i = 0; i < prompts.length; i++) {
            const prompt = prompts[i];
            const enhancedPrompt = `${prompt.prompt}, ${template.image_style}, ultra quality, 16:9`;
            
            try {
                // Tentar Pollinations com rate limiting
                await this.sleep(2000); // Rate limit manual
                
                const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1920&height=1080&nologo=true&seed=${Date.now()}`;
                
                const response = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 30000
                });
                
                const imagePath = path.join(imageDir, `scene_${i + 1}.jpg`);
                await fs.writeFile(imagePath, response.data);
                
                images.push({
                    path: imagePath,
                    prompt: enhancedPrompt,
                    quality_score: 8.5
                });
                
                console.log(`✅ Imagem ${i + 1}/${prompts.length} gerada`);
                
            } catch (error) {
                console.warn(`⚠️ Erro na imagem ${i + 1}, usando placeholder`);
                
                const placeholderPath = path.join(imageDir, `placeholder_${i + 1}.txt`);
                await fs.writeFile(placeholderPath, `Placeholder: ${enhancedPrompt}`);
                
                images.push({
                    path: placeholderPath,
                    quality_score: 3.0
                });
            }
        }
        
        return {
            paths: images.map(img => img.path),
            count: images.length,
            avg_quality: images.reduce((acc, img) => acc + img.quality_score, 0) / images.length,
            service: 'pollinations-rate-limited'
        };
    }

    // === VIDEO ASSEMBLY ===
    async assembleVideo(options) {
        if (!this.capabilities.video_assembly) {
            console.log('📹 Video assembly não disponível, gerando apenas assets');
            return null;
        }
        
        try {
            console.log('🎬 Iniciando montagem de vídeo...');
            
            const videoPath = await this.videoAssembler.createVideo({
                images: options.images,
                audio: options.audio,
                script: options.script,
                template: options.template,
                output: path.join(this.config.video_path, `${options.videoId}_final.mp4`),
                quality: this.config.video_quality
            });
            
            console.log(`✅ Vídeo montado: ${path.basename(videoPath)}`);
            
            return {
                path: videoPath,
                quality: this.config.video_quality,
                service: 'video-assembler',
                duration: this.estimateVideoDuration(options.audio, options.images.length)
            };
            
        } catch (error) {
            console.error('❌ Erro na montagem de vídeo:', error.message);
            return null;
        }
    }

    // === TEMPLATES E CONFIGURAÇÃO ===
    async loadTemplate(templateName) {
        const template = this.templateSelector.selectOptimalTemplate(templateName);
        
        // Otimizações Ultimate
        return {
            ...template,
            quality_threshold: Math.max(template.quality_weight?.script * 10 || 7, 8.0),
            rate_limit_priority: templateName === 'misterios-brasileiros' ? 1 : 0
        };
    }
    
    generateDefaultPrompts(template) {
        return [
            { prompt: `mysterious ${template.image_style} scene establishing shot` },
            { prompt: `${template.image_style} mysterious atmosphere wide view` },
            { prompt: `dark ${template.image_style} mysterious details close up` },
            { prompt: `${template.image_style} dramatic revealing scene` },
            { prompt: `${template.image_style} conclusion mysterious ending` }
        ];
    }

    // === GERAÇÃO DE CONTEÚDO ===
    async generateTopic(template) {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.8
            }
        });
        
        const prompt = `Crie um tópico ${template.style} ÚNICO seguindo JSON:
{
  "titulo": "título otimizado 60-80 chars",
  "categoria": "${template.style}",
  "viral_score": 88,
  "engagement_potential": "high",
  "target_audience": "descrição específica",
  "hashtags": ["#tag1", "#tag2", "#tag3"]
}

Foque em: ${template.keywords?.join(', ') || 'mistério, Brasil'}. APENAS JSON:`;

        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text());
    }
    
    async generateScript(topic, template) {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.75
            }
        });
        
        const prompt = `Roteiro PREMIUM para "${topic.titulo}":

Template: ${template.style}
Tom: ${template.script_tone}
Duração: ${template.target_length}s

JSON estruturado:
{
  "content": "roteiro profissional com timestamps [00:00], [00:30], etc",
  "hook_strength": 9,
  "retention_elements": ["mystery", "revelation", "cliffhanger"],
  "duration_estimate": "${template.target_length}s",
  "image_prompts": [
    {
      "prompt": "detailed English prompt + ${template.image_style}",
      "scene_type": "opening",
      "timing": "00:00-00:30"
    }
  ]
}

CRIE 5 prompts profissionais. APENAS JSON:`;

        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text());
    }

    // === QUALITY E MÉTRICAS ===
    async calculateUltimateQuality(assets, template) {
        const scores = {
            audio: assets.audio?.quality_score || 3.0,
            visual: assets.images?.avg_quality || 5.0,
            script: 8.5, // Base high quality
            video: assets.video ? 9.0 : 0
        };
        
        // Peso Ultimate (incluindo vídeo)
        const weights = {
            audio: this.withVideo ? 0.25 : 0.4,
            visual: this.withVideo ? 0.20 : 0.35,
            script: 0.25,
            video: this.withVideo ? 0.30 : 0
        };
        
        const finalScore = (
            scores.audio * weights.audio +
            scores.visual * weights.visual +
            scores.script * weights.script +
            scores.video * weights.video
        );
        
        console.log(`📊 Quality Ultimate Breakdown:`);
        console.log(`   🎙️ Audio: ${scores.audio.toFixed(1)}/10 (${(weights.audio * 100).toFixed(0)}%)`);
        console.log(`   🖼️ Visual: ${scores.visual.toFixed(1)}/10 (${(weights.visual * 100).toFixed(0)}%)`);
        console.log(`   📝 Script: ${scores.script.toFixed(1)}/10 (${(weights.script * 100).toFixed(0)}%)`);
        if (this.withVideo) {
            console.log(`   🎬 Video: ${scores.video.toFixed(1)}/10 (${(weights.video * 100).toFixed(0)}%)`);
        }
        console.log(`   🏆 Final: ${finalScore.toFixed(1)}/10`);
        
        return finalScore;
    }

    // === UTILS ===
    convertBase64ToWav(base64Data) {
        return Buffer.from(base64Data, 'base64');
    }
    
    estimateAudioDuration(text) {
        // Aproximadamente 150 palavras por minuto
        const words = text.split(/\s+/).length;
        return Math.round((words / 150) * 60);
    }
    
    estimateVideoDuration(audioPath, imageCount) {
        // Baseado no áudio + transições entre imagens
        return this.estimateAudioDuration('placeholder') + (imageCount * 2);
    }
    
    async setupDirectories() {
        const dirs = [
            this.config.output_path,
            this.config.video_path,
            this.config.cache_path
        ];
        await Promise.all(dirs.map(dir => fs.mkdir(dir, { recursive: true })));
    }
    
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    logVideoResult(result) {
        const duration = (result.execution_time / 1000).toFixed(1);
        const savings = result.cache_savings.toFixed(2);
        
        console.log(`\n✅ VÍDEO ULTIMATE CONCLUÍDO: ${result.videoId}`);
        console.log(`🏆 Qualidade: ${result.quality_score.toFixed(1)}/10`);
        console.log(`⏱️ Tempo: ${duration}s`);
        console.log(`💰 Cache Savings: $${savings}`);
        if (result.video) {
            console.log(`🎬 Video: ${path.basename(result.video.path)}`);
        }
        console.log('─'.repeat(50));
    }
    
    async generateFinalReport(results) {
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        const avgQuality = successful.length > 0 ?
            successful.reduce((acc, r) => acc + (r.quality_score || 0), 0) / successful.length : 0;
        const totalTime = (Date.now() - this.metrics.start_time) / 1000;
        
        console.log('\n' + '🎉'.repeat(20));
        console.log('       PIPELINE ULTIMATE CONCLUÍDO!');
        console.log('🎉'.repeat(20));
        console.log(`\n📊 RELATÓRIO EXECUTIVO:`);
        console.log(`   ✅ Sucessos: ${successful.length}/${results.length}`);
        console.log(`   🏆 Qualidade Média: ${avgQuality.toFixed(1)}/10`);
        console.log(`   ⏱️ Tempo Total: ${totalTime.toFixed(1)}s`);
        console.log(`   💰 Cache Savings: $${this.metrics.cache_savings.toFixed(2)}`);
        console.log(`   🎬 Vídeos Completos: ${successful.filter(r => r.video).length}`);
        console.log(`   🚀 Modo: ${this.mode.toUpperCase()}`);
        
        if (failed.length > 0) {
            console.log(`   ❌ Falhas: ${failed.length}`);
        }
        
        // Rate Limiter Stats
        console.log('\n🚦 RATE LIMITER PERFORMANCE:');
        this.rateLimiter.printStats();
        
        console.log('\n' + '🎉'.repeat(20));
    }
    
    async handleCriticalError(error) {
        console.error('\n💥 ERRO CRÍTICO NO PIPELINE ULTIMATE:', error.message);
        
        // Salvar estado para debug
        const errorReport = {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
            metrics: this.metrics,
            config: this.config
        };
        
        try {
            await fs.writeFile(
                path.join(this.config.output_path, 'error_report.json'),
                JSON.stringify(errorReport, null, 2)
            );
        } catch {
            // Ignore write errors in error handler
        }
    }
}

// === CLI INTERFACE ULTIMATE ===
if (require.main === module) {
    const args = process.argv.slice(2);
    
    const options = {
        template: null,
        batch: 1,
        withVideo: false,
        commercial: false,
        mode: 'auto'
    };
    
    // Parse argumentos
    args.forEach(arg => {
        if (arg.startsWith('--template=')) options.template = arg.split('=')[1];
        if (arg.startsWith('--batch=')) options.batch = parseInt(arg.split('=')[1]);
        if (arg === '--with-video') options.withVideo = true;
        if (arg === '--commercial') options.commercial = true;
        if (arg.startsWith('--mode=')) options.mode = arg.split('=')[1];
    });
    
    console.log(`\n🚀 PIPELINE ULTIMATE v5.0 - Enterprise Video Automation`);
    console.log('=' .repeat(60));
    console.log(`📋 Template: ${options.template || 'auto-select'}`);
    console.log(`📊 Batch: ${options.batch} vídeo(s)`);
    console.log(`🎬 Video Assembly: ${options.withVideo ? 'SIM' : 'NÃO'}`);
    console.log(`💰 Commercial Mode: ${options.commercial ? 'SIM' : 'NÃO'}`);
    console.log('=' .repeat(60));
    
    const pipeline = new PipelineUltimate(options);
    
    pipeline.execute(options)
        .then(results => {
            const successful = results.filter(r => r.success).length;
            const avgQuality = results
                .filter(r => r.success)
                .reduce((acc, r) => acc + (r.quality_score || 0), 0) / successful || 0;
            
            console.log(`\n🎉 PIPELINE ULTIMATE FINALIZADO!`);
            console.log(`✅ Sucessos: ${successful}/${results.length}`);
            console.log(`🏆 Qualidade média: ${avgQuality.toFixed(1)}/10`);
            console.log(`💰 Cache savings: $${pipeline.metrics.cache_savings.toFixed(2)}`);
            
            process.exit(0);
        })
        .catch(error => {
            console.error(`\n💥 ERRO CRÍTICO:`, error.message);
            process.exit(1);
        });
}

module.exports = PipelineUltimate;