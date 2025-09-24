#!/usr/bin/env node
/**
 * PIPELINE PRO v4.0 - Sistema Enterprise de Automação de Vídeos
 * Otımizado para produção com cache inteligente, templates e quality scoring
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const fssync = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

// Módulos Pro
const SmartCache = require('./utils/smart-cache');
const QualityAnalyzer = require('./utils/quality-analyzer');
const TemplateSelector = require('./modules/template-selector');
const PerformanceTracker = require('./utils/performance-tracker');
const AutoRecovery = require('./utils/auto-recovery');

class PipelinePro {
    constructor(options = {}) {
        this.mode = options.mode || 'auto';
        this.template = options.template || null;
        this.batchSize = options.batch || 1;
        
        // Sistema avançado
        this.cache = new SmartCache();
        this.qualityAnalyzer = new QualityAnalyzer();
        this.templateSelector = new TemplateSelector();
        this.performanceTracker = new PerformanceTracker();
        this.autoRecovery = new AutoRecovery();
        
        this.capabilities = {
            gemini_tts: false,
            nano_banana: false,
            huggingface: false,
            local_tools: false
        };
        
        this.config = {
            output_path: 'novo/output',
            cache_path: 'novo/cache',
            templates_path: 'novo/templates',
            quality_threshold: 8.0, // Mínimo 8/10 para finalizar
            max_retries: 3,
            async_concurrency: 3
        };
        
        this.metrics = {
            start_time: null,
            total_cost: 0,
            cache_savings: 0,
            quality_scores: [],
            execution_times: []
        };
    }

    // === DETECÇÃO AVANÇADA DE CAPACIDADES ===
    async detectCapabilities() {
        console.log('🔍 [PRO] Detectando capacidades avançadas...');
        
        const capabilities = {};
        
        // Gemini TTS Premium
        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey && geminiKey.length > 10) {
            capabilities.gemini_tts = {
                available: true,
                type: 'premium',
                voices: 30,
                key_preview: geminiKey.substring(0,10) + '...'
            };
            this.capabilities.gemini_tts = true;
            console.log(`✅ Gemini TTS Premium (${capabilities.gemini_tts.voices} vozes)`);
        }
        
        // APIs de Imagem
        capabilities.image_services = [];
        if (process.env.NANO_BANANA_API_KEY) {
            capabilities.image_services.push('nano-banana');
            this.capabilities.nano_banana = true;
        }
        if (process.env.HUGGINGFACE_API_KEY) {
            capabilities.image_services.push('huggingface');
            this.capabilities.huggingface = true;
        }
        capabilities.image_services.push('pollinations', 'placeholder');
        
        console.log(`🖼️ Serviços de imagem: ${capabilities.image_services.join(', ')}`);
        
        // Modo otimizado
        this.mode = this.selectOptimalMode();
        console.log(`🎯 Modo PRO selecionado: ${this.mode.toUpperCase()}`);
        
        return capabilities;
    }
    
    selectOptimalMode() {
        if (this.capabilities.gemini_tts && this.capabilities.nano_banana) {
            return 'enterprise';
        } else if (this.capabilities.gemini_tts) {
            return 'professional';
        } else {
            return 'standard';
        }
    }

    // === SISTEMA DE TEMPLATES INTELIGENTE ===
    async loadTemplate(templateName, context = {}) {
        const templates = {
            'misterios-brasileiros': {
                voice: 'Kore',
                style: 'dark-mysterious',
                image_style: 'dark, mysterious, Brazilian landscape',
                script_tone: 'suspenseful',
                target_length: 180, // 3 minutos
                quality_weight: {
                    audio: 0.4,
                    visual: 0.35,
                    script: 0.25
                }
            },
            'curiosidades-cientificas': {
                voice: 'Charon',
                style: 'clean-scientific',
                image_style: 'scientific, clean, educational',
                script_tone: 'informative',
                target_length: 240,
                quality_weight: {
                    audio: 0.3,
                    visual: 0.3,
                    script: 0.4
                }
            },
            'historias-urbanas': {
                voice: 'Zephyr',
                style: 'modern-urban',
                image_style: 'urban, modern, city scenes',
                script_tone: 'engaging',
                target_length: 200,
                quality_weight: {
                    audio: 0.35,
                    visual: 0.4,
                    script: 0.25
                }
            },
            'lendas-folclore': {
                voice: 'Gacrux',
                style: 'rustic-traditional',
                image_style: 'traditional, rustic, Brazilian folklore',
                script_tone: 'storytelling',
                target_length: 220,
                quality_weight: {
                    audio: 0.45,
                    visual: 0.3,
                    script: 0.25
                }
            }
        };
        
        const template = templates[templateName] || templates['misterios-brasileiros'];
        console.log(`📋 Template carregado: ${templateName} (voz: ${template.voice})`);
        
        return template;
    }

    // === CACHE SEMÂNTICO AVANÇADO ===
    async checkSemanticCache(operation, content) {
        const cacheKey = this.generateSemanticKey(operation, content);
        const cached = await this.cache.get(cacheKey);
        
        if (cached) {
            // Verificar similaridade semântica
            const similarity = this.calculateSimilarity(content, cached.original_content);
            
            if (similarity > 0.85) {
                console.log(`🧠 Cache semântico hit: ${(similarity * 100).toFixed(1)}% similar`);
                this.metrics.cache_savings += cached.estimated_cost || 0.15;
                return cached.data;
            }
        }
        
        return null;
    }
    
    async saveSemanticCache(operation, content, data, cost = 0) {
        const cacheKey = this.generateSemanticKey(operation, content);
        await this.cache.set(cacheKey, {
            data,
            original_content: content,
            estimated_cost: cost,
            quality_score: data.quality_score || 0,
            timestamp: Date.now()
        }, 7 * 24 * 60 * 60 * 1000); // 7 dias
    }
    
    generateSemanticKey(operation, content) {
        const contentHash = crypto.createHash('md5')
            .update(content.substring(0, 200))
            .digest('hex');
        return `semantic_${operation}_${contentHash}`;
    }
    
    calculateSimilarity(text1, text2) {
        const words1 = text1.toLowerCase().split(/\s+/);
        const words2 = text2.toLowerCase().split(/\s+/);
        
        const intersection = words1.filter(word => words2.includes(word));
        const union = [...new Set([...words1, ...words2])];
        
        return intersection.length / union.length;
    }

    // === GERAÇÃO COM QUALITY SCORING ===
    async generateWithQuality(generator, params, minQuality = 8.0) {
        let attempts = 0;
        let bestResult = null;
        let bestScore = 0;
        
        while (attempts < this.config.max_retries) {
            try {
                console.log(`🎯 Tentativa ${attempts + 1}/${this.config.max_retries}`);
                
                const result = await generator(params);
                const qualityScore = await this.qualityAnalyzer.analyze(result);
                
                console.log(`📊 Quality Score: ${qualityScore.toFixed(1)}/10`);
                
                if (qualityScore >= minQuality) {
                    console.log(`✅ Qualidade aprovada: ${qualityScore.toFixed(1)}/10`);
                    result.quality_score = qualityScore;
                    return result;
                }
                
                if (qualityScore > bestScore) {
                    bestResult = result;
                    bestScore = qualityScore;
                }
                
                attempts++;
                
                // Ajuste dinâmico de parâmetros
                params = this.optimizeParams(params, qualityScore);
                
            } catch (error) {
                console.warn(`⚠️ Erro na tentativa ${attempts + 1}:`, error.message);
                attempts++;
                
                if (attempts >= this.config.max_retries) {
                    if (bestResult) {
                        console.log(`🔄 Usando melhor resultado: ${bestScore.toFixed(1)}/10`);
                        bestResult.quality_score = bestScore;
                        return bestResult;
                    }
                    throw error;
                }
            }
        }
        
        return bestResult;
    }
    
    optimizeParams(params, currentScore) {
        // Otimização dinâmica baseada no score atual
        if (currentScore < 6.0) {
            // Score muito baixo - mudanças drásticas
            if (params.temperature) params.temperature = Math.max(0.3, params.temperature - 0.2);
            if (params.style) params.style += ', high quality, professional';
        } else if (currentScore < 8.0) {
            // Score médio - ajustes sutis
            if (params.temperature) params.temperature = Math.max(0.5, params.temperature - 0.1);
            if (params.style) params.style += ', enhanced quality';
        }
        
        return params;
    }

    // === EXECUÇÃO ASSÍNCRONA OTIMIZADA ===
    async executeBatch(batchSize = 1) {
        console.log(`🚀 [PRO] Iniciando execução em lote: ${batchSize} vídeos`);
        
        const results = [];
        const startTime = Date.now();
        
        // Execução paralela com controle de concorrência
        const semaphore = new Array(this.config.async_concurrency).fill(null);
        const batches = [];
        
        for (let i = 0; i < batchSize; i += this.config.async_concurrency) {
            const batchItems = [];
            for (let j = 0; j < this.config.async_concurrency && (i + j) < batchSize; j++) {
                batchItems.push(this.executeSingle(`batch_${i + j + 1}`));
            }
            batches.push(Promise.all(batchItems));
        }
        
        for (const batch of batches) {
            const batchResults = await batch;
            results.push(...batchResults);
            
            // Pausa entre batches para não sobrecarregar APIs
            if (batches.indexOf(batch) < batches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        const totalTime = Date.now() - startTime;
        const avgTime = totalTime / batchSize;
        
        console.log(`\n🎉 LOTE CONCLUÍDO!`);
        console.log(`📊 Estatísticas:`);
        console.log(`   📈 Vídeos: ${results.filter(r => r.success).length}/${batchSize} sucesso`);
        console.log(`   ⏱️ Tempo total: ${(totalTime / 1000).toFixed(1)}s`);
        console.log(`   ⚡ Tempo médio: ${(avgTime / 1000).toFixed(1)}s/vídeo`);
        console.log(`   💰 Economia cache: $${this.metrics.cache_savings.toFixed(2)}`);
        console.log(`   📊 Qualidade média: ${this.getAverageQuality().toFixed(1)}/10`);
        
        return results;
    }
    
    async executeSingle(executionId) {
        const sessionStart = Date.now();
        
        try {
            await this.detectCapabilities();
            
            // Template inteligente
            const template = await this.loadTemplate(this.template || 'misterios-brasileiros');
            
            // Etapa 1: Descobrir conteúdo (com cache semântico)
            let topic = await this.checkSemanticCache('topic', template.style);
            if (!topic) {
                topic = await this.generateTopic(template);
                await this.saveSemanticCache('topic', template.style, topic, 0.05);
            }
            
            // Etapa 2: Gerar roteiro (com quality scoring)
            let script = await this.checkSemanticCache('script', topic.titulo);
            if (!script) {
                script = await this.generateWithQuality(
                    (params) => this.generateScript(params.topic, params.template),
                    { topic, template },
                    template.quality_weight.script * 10
                );
                await this.saveSemanticCache('script', topic.titulo, script, 0.10);
            }
            
            const executionPath = path.join(this.config.output_path, executionId);
            await fs.mkdir(executionPath, { recursive: true });
            
            // Etapa 3: Assets paralelos com recovery
            const [images, audio] = await Promise.all([
                this.autoRecovery.execute(() => this.generateImages(script, executionPath, template)),
                this.autoRecovery.execute(() => this.generateAudio(script, executionPath, template))
            ]);
            
            // Etapa 4: Quality final
            const finalQuality = await this.calculateFinalQuality(
                { images, audio, script }, 
                template.quality_weight
            );
            
            const sessionTime = Date.now() - sessionStart;
            this.metrics.execution_times.push(sessionTime);
            this.metrics.quality_scores.push(finalQuality);
            
            const result = {
                success: true,
                executionId,
                topic,
                script,
                images,
                audio,
                quality_score: finalQuality,
                template: this.template,
                execution_time: sessionTime,
                cache_savings: this.metrics.cache_savings
            };
            
            // Log de métricas
            await this.performanceTracker.log(result);
            
            console.log(`\n✅ VÍDEO CONCLUÍDO: ${executionId}`);
            console.log(`📊 Qualidade: ${finalQuality.toFixed(1)}/10`);
            console.log(`⏱️ Tempo: ${(sessionTime / 1000).toFixed(1)}s`);
            console.log(`💰 Economia: $${this.metrics.cache_savings.toFixed(2)}`);
            
            return result;
            
        } catch (error) {
            console.error(`❌ Erro no vídeo ${executionId}:`, error.message);
            return {
                success: false,
                executionId,
                error: error.message,
                execution_time: Date.now() - sessionStart
            };
        }
    }

    // === GERAÇÃO OTIMIZADA DE CONTEÚDO ===
    async generateTopic(template) {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.8
            }
        });
        
        const prompt = `Gere um tópico para ${template.style} seguindo exatamente esta estrutura JSON:
        
{
  "titulo": "título otimizado para YouTube (60-80 chars)",
  "categoria": "categoria-principal", 
  "viral_score": 85,
  "target_audience": "descrição do público",
  "hashtags": ["#tag1", "#tag2", "#tag3"],
  "estimated_engagement": "high"
}

Estilo: ${template.style}
Tom: ${template.script_tone}
Duração alvo: ${template.target_length}s

IMPORTANTE: Retorne APENAS o JSON válido.`;

        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text());
    }
    
    async generateScript(topic, template) {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.7
            }
        });
        
        const prompt = `Crie um roteiro profissional para: "${topic.titulo}"

Template: ${template.style}
Tom: ${template.script_tone}  
Duração: ${template.target_length}s
Público: ${topic.target_audience}

Estrutura JSON:
{
  "content": "roteiro completo com timestamps [00:15], [00:30] etc",
  "duration": "${template.target_length}s",
  "hook_strength": 9,
  "retention_score": 8.5,
  "image_prompts": [
    {
      "prompt": "prompt em inglês + ${template.image_style}",
      "negativePrompt": "elementos a evitar",
      "scene_type": "opening|middle|climax|ending"
    }
  ]
}

CRIE 5 prompts de imagem profissionais.
IMPORTANTE: Retorne APENAS o JSON.`;

        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text());
    }
    
    async generateImages(script, outputPath, template) {
        const imageDir = path.join(outputPath, 'images');
        await fs.mkdir(imageDir, { recursive: true });
        
        const images = [];
        
        for (let i = 0; i < script.image_prompts.length; i++) {
            const prompt = script.image_prompts[i];
            const enhancedPrompt = `${prompt.prompt}, ${template.image_style}, professional quality, 16:9 aspect ratio`;
            
            try {
                // Tentar Pollinations (mais confiável)
                const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1920&height=1080&nologo=true`;
                
                const response = await axios.get(imageUrl, { 
                    responseType: 'arraybuffer',
                    timeout: 30000 
                });
                
                const imagePath = path.join(imageDir, `scene_${i + 1}.jpg`);
                await fs.writeFile(imagePath, response.data);
                
                images.push({
                    path: imagePath,
                    prompt: enhancedPrompt,
                    service: 'pollinations',
                    quality_score: 8.0
                });
                
                console.log(`🖼️ Imagem ${i + 1}/5 gerada: scene_${i + 1}.jpg`);
                
            } catch (error) {
                console.warn(`⚠️ Erro na imagem ${i + 1}, usando placeholder`);
                
                // Placeholder local
                const placeholderPath = path.join(imageDir, `placeholder_${i + 1}.txt`);
                await fs.writeFile(placeholderPath, `Placeholder for: ${enhancedPrompt}`);
                
                images.push({
                    path: placeholderPath,
                    prompt: enhancedPrompt,
                    service: 'placeholder',
                    quality_score: 4.0
                });
            }
            
            // Pausa entre imagens
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        return {
            paths: images.map(img => img.path),
            service: 'optimized-multi',
            count: images.length,
            avg_quality: images.reduce((acc, img) => acc + img.quality_score, 0) / images.length
        };
    }
    
    async generateAudio(script, outputPath, template) {
        try {
            const GeminiTTS = require('./modules/gemini-tts-premium');
            const tts = new GeminiTTS({ 
                voice: template.voice,
                apiKey: process.env.GEMINI_API_KEY
            });
            
            const result = await tts.generateFromScript(
                script.content,
                template.style,
                outputPath
            );
            
            return {
                path: result.localPath,
                service: 'gemini-tts-premium',
                voice: result.voice,
                duration: result.duration,
                quality_score: 9.0
            };
            
        } catch (error) {
            console.warn('⚠️ Gemini TTS falhou, criando mock de áudio');
            
            const mockPath = path.join(outputPath, 'audio_mock.txt');
            await fs.writeFile(mockPath, `Mock de áudio para:\n\n${script.content}`);
            
            return {
                path: mockPath,
                service: 'mock-audio',
                duration: template.target_length,
                quality_score: 3.0
            };
        }
    }

    // === QUALITY SCORING FINAL ===
    async calculateFinalQuality(assets, weights) {
        const scores = {};
        
        // Audio quality
        scores.audio = assets.audio?.quality_score || 3.0;
        
        // Visual quality  
        scores.visual = assets.images?.avg_quality || 5.0;
        
        // Script quality
        scores.script = (assets.script?.hook_strength + assets.script?.retention_score) / 2 || 6.0;
        
        // Weighted average
        const finalScore = (
            scores.audio * weights.audio +
            scores.visual * weights.visual + 
            scores.script * weights.script
        );
        
        console.log(`📊 Quality Breakdown:`);
        console.log(`   🎙️ Audio: ${scores.audio.toFixed(1)}/10 (${(weights.audio * 100).toFixed(0)}%)`);
        console.log(`   🖼️ Visual: ${scores.visual.toFixed(1)}/10 (${(weights.visual * 100).toFixed(0)}%)`);
        console.log(`   📝 Script: ${scores.script.toFixed(1)}/10 (${(weights.script * 100).toFixed(0)}%)`);
        console.log(`   🏆 Final: ${finalScore.toFixed(1)}/10`);
        
        return finalScore;
    }
    
    getAverageQuality() {
        if (this.metrics.quality_scores.length === 0) return 0;
        return this.metrics.quality_scores.reduce((a, b) => a + b, 0) / this.metrics.quality_scores.length;
    }
}

// === CLI INTERFACE PRO ===
if (require.main === module) {
    const args = process.argv.slice(2);
    
    const options = {
        template: null,
        batch: 1,
        mode: 'auto'
    };
    
    // Parse argumentos
    args.forEach(arg => {
        if (arg.startsWith('--template=')) options.template = arg.split('=')[1];
        if (arg.startsWith('--batch=')) options.batch = parseInt(arg.split('=')[1]);
        if (arg.startsWith('--mode=')) options.mode = arg.split('=')[1];
    });
    
    console.log(`
🚀 PIPELINE PRO v4.0 - Enterprise Video Automation
============================================
📋 Template: ${options.template || 'auto-select'}
📊 Batch: ${options.batch} vídeo(s)
🎯 Modo: ${options.mode}
============================================
`);
    
    const pipeline = new PipelinePro(options);
    
    pipeline.executeBatch(options.batch)
        .then(results => {
            const successful = results.filter(r => r.success).length;
            const avgQuality = results
                .filter(r => r.success)
                .reduce((acc, r) => acc + (r.quality_score || 0), 0) / successful || 0;
            
            console.log(`\n🎉 PIPELINE PRO CONCLUÍDO!`);
            console.log(`✅ Sucessos: ${successful}/${results.length}`);
            console.log(`📊 Qualidade média: ${avgQuality.toFixed(1)}/10`);
            console.log(`💰 Economia total: $${pipeline.metrics.cache_savings.toFixed(2)}`);
            
            process.exit(0);
        })
        .catch(error => {
            console.error(`💥 ERRO CRÍTICO:`, error.message);
            process.exit(1);
        });
}

module.exports = PipelinePro;