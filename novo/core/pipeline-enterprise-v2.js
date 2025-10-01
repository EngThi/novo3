/**
 * Enterprise Pipeline Core V2 - Gemini Flash + Nano Banana
 */

const EventEmitter = require('events');

class EnterprisePipelineCoreV2 extends EventEmitter {
    constructor(dependencies = {}) {
        super();
        
        this.config = dependencies.config;
        this.logger = dependencies.logger || console;
        this.cache = dependencies.cache;
        
        // Importar geradores REAIS
        const GeminiFlashScriptGenerator = require('../services/ai/gemini-flash-script-generator');
        const NanoBananaImageGenerator = require('../services/ai/nano-banana-image-generator');
        const AdvancedVideoAssembler = require('../services/video/advanced-video-assembler');
        
        this.scriptGenerator = new GeminiFlashScriptGenerator(dependencies);
        this.imageGenerator = new NanoBananaImageGenerator(dependencies);
        this.videoAssembler = new AdvancedVideoAssembler();
        
        this.activeJobs = new Map();
        this.metrics = {
            totalJobs: 0,
            successfulJobs: 0,
            failedJobs: 0,
            averageTime: 0
        };
    }
    
    async execute(params) {
        const jobId = this.generateJobId();
        const strategy = params.strategy || 'gcp-free';
        const startTime = Date.now();
        
        try {
            this.activeJobs.set(jobId, {
                startTime,
                strategy,
                status: 'running',
                progress: 0
            });
            
            this.emit('job:started', jobId, strategy);
            
            // 1. GERAR SCRIPT COM GEMINI FLASH + WEB REAL-TIME
            console.log(`🧠 1/4 - Gerando script com Gemini Flash...`);
            this.updateProgress(jobId, 10);
            
            const scriptResult = await this.scriptGenerator.generateScript({
                topic: params.prompt,
                style: params.style || 'educativo',
                duration: params.duration || 'medium'
            });
            
            this.updateProgress(jobId, 25);
            
            // 2. GERAR PROMPTS DE IMAGEM COM GEMINI FLASH
            console.log(`🎨 2/4 - Gerando prompts visuais...`);
            
            const promptsResult = await this.scriptGenerator.generateVideoPrompts(
                { script: scriptResult.data },
                {} // thumbnail data
            );
            
            this.updateProgress(jobId, 40);
            
            // 3. GERAR IMAGENS COM NANO BANANA
            console.log(`🍌 3/4 - Gerando imagens com Nano Banana...`);
            
            const imagesResult = await this.imageGenerator.generateImageSequence(
                promptsResult.data.prompts,
                jobId
            );
            
            this.updateProgress(jobId, 70);
            
            // 4. MONTAR VÍDEO FINAL
            console.log(`🎬 4/4 - Montando vídeo final...`);
            
            const finalVideo = await this.videoAssembler.assembleVideoFromImages({
                jobId,
                images: imagesResult.images,
                script: scriptResult.data,
                duration: this.getDurationFromStrategy(strategy)
            });
            
            this.updateProgress(jobId, 100);
            
            const duration = Date.now() - startTime;
            
            const fullResult = {
                script: scriptResult,
                prompts: promptsResult,
                images: imagesResult,
                video: finalVideo,
                pipeline: {
                    jobId,
                    strategy,
                    duration,
                    steps: 4,
                    status: 'completed'
                }
            };
            
            this.activeJobs.delete(jobId);
            this.updateMetrics(duration, true);
            this.emit('job:completed', jobId, duration, fullResult);
            
            return {
                success: true,
                jobId,
                strategy,
                duration,
                result: fullResult
            };
            
        } catch (error) {
            this.activeJobs.delete(jobId);
            this.updateMetrics(Date.now() - startTime, false);
            this.emit('job:failed', jobId, error);
            
            throw {
                success: false,
                jobId,
                strategy,
                error: error.message,
                duration: Date.now() - startTime
            };
        }
    }
    
    updateProgress(jobId, progress) {
        if (this.activeJobs.has(jobId)) {
            this.activeJobs.get(jobId).progress = progress;
            this.emit('job:progress', jobId, progress);
        }
    }
    
    getDurationFromStrategy(strategy) {
        const durations = {
            'speed': 15,
            'gcp-free': 20,
            'premium': 30,
            'quality': 45
        };
        
        return durations[strategy] || 20;
    }
    
    generateJobId(prefix = 'job') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `${prefix}-${timestamp}-${random}`;
    }
    
    updateMetrics(duration, success) {
        this.metrics.totalJobs++;
        if (success) {
            this.metrics.successfulJobs++;
            this.metrics.averageTime = 
                (this.metrics.averageTime * (this.metrics.successfulJobs - 1) + duration) / 
                this.metrics.successfulJobs;
        } else {
            this.metrics.failedJobs++;
        }
    }
    
    async healthCheck() {
        const scriptHealth = await this.scriptGenerator.healthCheck();
        const imageHealth = await this.imageGenerator.healthCheck();
        
        return {
            status: 'healthy',
            service: 'Enterprise Pipeline Core V2',
            features: {
                geminiFlash: scriptHealth.features.realTimeWeb,
                nanoBanana: imageHealth.features.multipleAPIs > 0,
                ffmpegAssembly: true,
                retrySystem: true
            },
            apis: {
                gemini: scriptHealth.apis.total,
                nanoBanana: imageHealth.apis.total
            },
            pipeline: {
                steps: 4,
                strategies: ['speed', 'gcp-free', 'premium', 'quality']
            }
        };
    }
}

module.exports = EnterprisePipelineCoreV2;
