const fs = require('fs').promises;
const path = require('path');

/**
 * Sistema de Tracking de Performance
 * Coleta e analisa métricas de execução do pipeline
 */
class PerformanceTracker {
    constructor() {
        this.metricsPath = path.join('novo', 'logs', 'metrics');
        this.currentSession = {
            start_time: Date.now(),
            executions: [],
            total_cost: 0,
            cache_hits: 0,
            cache_misses: 0
        };
        
        this.init();
    }
    
    async init() {
        try {
            await fs.mkdir(this.metricsPath, { recursive: true });
            console.log('📊 Performance Tracker inicializado');
        } catch (error) {
            console.warn('⚠️ Erro ao inicializar tracker:', error.message);
        }
    }
    
    // === LOG DE EXECUÇÕES ===
    async log(executionResult) {
        const metric = {
            timestamp: Date.now(),
            execution_id: executionResult.executionId,
            success: executionResult.success,
            quality_score: executionResult.quality_score || 0,
            execution_time: executionResult.execution_time || 0,
            template: executionResult.template,
            mode: executionResult.mode,
            cache_savings: executionResult.cache_savings || 0,
            components: {
                audio: {
                    service: executionResult.audio?.service,
                    duration: executionResult.audio?.duration,
                    quality: executionResult.audio?.quality_score
                },
                images: {
                    service: executionResult.images?.service,
                    count: executionResult.images?.count,
                    quality: executionResult.images?.avg_quality
                }
            }
        };
        
        this.currentSession.executions.push(metric);
        this.currentSession.total_cost += this.estimateCost(executionResult);
        
        // Salvar métrica individual
        await this.saveMetric(metric);
        
        console.log(`📊 Metric logged: ${executionResult.executionId} (${metric.quality_score.toFixed(1)}/10)`);
    }
    
    // === ESTIMAÇÃO DE CUSTOS ===
    estimateCost(result) {
        let cost = 0;
        
        // Custo Gemini TTS
        if (result.audio?.service === 'gemini-tts-premium') {
            const duration = result.audio.duration || 180;
            cost += (duration / 60) * 0.08; // $0.08 por minuto
        }
        
        // Custo Gemini Content Generation
        cost += 0.02; // Aproximadamente $0.02 por geração de script
        
        // Custo de imagens (se premium)
        if (result.images?.service !== 'free' && result.images?.service !== 'placeholder') {
            cost += (result.images?.count || 0) * 0.01; // $0.01 por imagem
        }
        
        return cost;
    }
    
    // === PERSISTENCIA ===
    async saveMetric(metric) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const metricsFile = path.join(this.metricsPath, `metrics_${today}.json`);
            
            let metrics = [];
            try {
                const existing = await fs.readFile(metricsFile, 'utf8');
                metrics = JSON.parse(existing);
            } catch {
                // Arquivo não existe, ok
            }
            
            metrics.push(metric);
            
            await fs.writeFile(metricsFile, JSON.stringify(metrics, null, 2));
            
        } catch (error) {
            console.warn('⚠️ Erro ao salvar métrica:', error.message);
        }
    }
    
    // === ESTATÍSTICAS ===
    async getStats(days = 7) {
        try {
            const stats = {
                total_executions: 0,
                successful_executions: 0,
                total_cost: 0,
                avg_quality: 0,
                avg_execution_time: 0,
                template_performance: {},
                daily_breakdown: [],
                quality_distribution: {
                    excellent: 0, // 9-10
                    good: 0,      // 7-8.9
                    acceptable: 0, // 5-6.9
                    poor: 0       // <5
                }
            };
            
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
            
            // Coletar métricas dos últimos dias
            const allMetrics = [];
            
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const metricsFile = path.join(this.metricsPath, `metrics_${dateStr}.json`);
                
                try {
                    const dayMetrics = JSON.parse(await fs.readFile(metricsFile, 'utf8'));
                    allMetrics.push(...dayMetrics);
                } catch {
                    // Arquivo do dia não existe
                }
            }
            
            // Processar métricas
            const qualities = [];
            const executionTimes = [];
            
            for (const metric of allMetrics) {
                stats.total_executions++;
                
                if (metric.success) {
                    stats.successful_executions++;
                    
                    if (metric.quality_score > 0) {
                        qualities.push(metric.quality_score);
                        
                        // Distribuição de qualidade
                        if (metric.quality_score >= 9) stats.quality_distribution.excellent++;
                        else if (metric.quality_score >= 7) stats.quality_distribution.good++;
                        else if (metric.quality_score >= 5) stats.quality_distribution.acceptable++;
                        else stats.quality_distribution.poor++;
                    }
                }
                
                if (metric.execution_time > 0) {
                    executionTimes.push(metric.execution_time);
                }
                
                // Performance por template
                if (metric.template) {
                    if (!stats.template_performance[metric.template]) {
                        stats.template_performance[metric.template] = {
                            count: 0,
                            avg_quality: 0,
                            avg_time: 0,
                            success_rate: 0
                        };
                    }
                    
                    const templateStats = stats.template_performance[metric.template];
                    templateStats.count++;
                    
                    if (metric.success && metric.quality_score > 0) {
                        templateStats.avg_quality = 
                            (templateStats.avg_quality * (templateStats.count - 1) + metric.quality_score) / templateStats.count;
                    }
                    
                    if (metric.execution_time > 0) {
                        templateStats.avg_time = 
                            (templateStats.avg_time * (templateStats.count - 1) + metric.execution_time) / templateStats.count;
                    }
                }
                
                stats.total_cost += this.estimateCost({ 
                    audio: metric.components?.audio,
                    images: metric.components?.images
                });
            }
            
            // Calcular médias
            stats.avg_quality = qualities.length > 0 ? 
                qualities.reduce((a, b) => a + b, 0) / qualities.length : 0;
                
            stats.avg_execution_time = executionTimes.length > 0 ? 
                executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length : 0;
            
            // Taxa de sucesso por template
            for (const template of Object.keys(stats.template_performance)) {
                const templateStats = stats.template_performance[template];
                const successCount = allMetrics.filter(m => 
                    m.template === template && m.success
                ).length;
                templateStats.success_rate = (successCount / templateStats.count) * 100;
            }
            
            return stats;
            
        } catch (error) {
            console.warn('⚠️ Erro ao calcular estatísticas:', error.message);
            return null;
        }
    }
    
    // === RELATÓRIOS ===
    async printReport(days = 7) {
        const stats = await this.getStats(days);
        
        if (!stats) {
            console.log('❌ Não foi possível gerar relatório');
            return;
        }
        
        console.log(`\n📊 PERFORMANCE REPORT (${days} days)`);
        console.log('=====================================');
        console.log(`📈 Total Executions: ${stats.total_executions}`);
        console.log(`✅ Success Rate: ${((stats.successful_executions / stats.total_executions) * 100).toFixed(1)}%`);
        console.log(`💰 Total Cost: $${stats.total_cost.toFixed(2)}`);
        console.log(`📊 Avg Quality: ${stats.avg_quality.toFixed(1)}/10`);
        console.log(`⏱️ Avg Time: ${(stats.avg_execution_time / 1000).toFixed(1)}s`);
        
        console.log('\n🏆 Quality Distribution:');
        console.log(`   Excellent (9-10): ${stats.quality_distribution.excellent}`);
        console.log(`   Good (7-8.9): ${stats.quality_distribution.good}`);
        console.log(`   Acceptable (5-6.9): ${stats.quality_distribution.acceptable}`);
        console.log(`   Poor (<5): ${stats.quality_distribution.poor}`);
        
        if (Object.keys(stats.template_performance).length > 0) {
            console.log('\n🎨 Template Performance:');
            for (const [template, perf] of Object.entries(stats.template_performance)) {
                console.log(`   ${template}:`);
                console.log(`     Uses: ${perf.count}`);
                console.log(`     Quality: ${perf.avg_quality.toFixed(1)}/10`);
                console.log(`     Time: ${(perf.avg_time / 1000).toFixed(1)}s`);
                console.log(`     Success: ${perf.success_rate.toFixed(1)}%`);
            }
        }
        
        console.log('=====================================\n');
    }
    
    // === SESSÃO ATUAL ===
    getCurrentSessionStats() {
        const sessionTime = Date.now() - this.currentSession.start_time;
        const successCount = this.currentSession.executions.filter(e => e.success).length;
        
        return {
            duration: sessionTime,
            executions: this.currentSession.executions.length,
            successes: successCount,
            success_rate: this.currentSession.executions.length > 0 ? 
                (successCount / this.currentSession.executions.length) * 100 : 0,
            total_cost: this.currentSession.total_cost,
            avg_quality: this.currentSession.executions.length > 0 ?
                this.currentSession.executions
                    .filter(e => e.success && e.quality_score > 0)
                    .reduce((acc, e) => acc + e.quality_score, 0) / 
                this.currentSession.executions.filter(e => e.success && e.quality_score > 0).length
                : 0
        };
    }
    
    printSessionStats() {
        const stats = this.getCurrentSessionStats();
        
        console.log('\n🔥 CURRENT SESSION STATS');
        console.log('========================');
        console.log(`⏱️ Duration: ${(stats.duration / 1000 / 60).toFixed(1)} minutes`);
        console.log(`📈 Executions: ${stats.executions}`);
        console.log(`✅ Success Rate: ${stats.success_rate.toFixed(1)}%`);
        console.log(`💰 Session Cost: $${stats.total_cost.toFixed(2)}`);
        console.log(`📊 Avg Quality: ${stats.avg_quality.toFixed(1)}/10`);
        console.log('========================\n');
    }
}

module.exports = PerformanceTracker;