const fs = require('fs').promises;
const path = require('path');

/**
 * Sistema de Análise de Qualidade Automática
 * Avalia qualidade de áudio, visual e script usando IA e métricas
 */
class QualityAnalyzer {
    constructor() {
        this.weights = {
            audio: 0.4,
            visual: 0.35,
            script: 0.25
        };
        
        this.thresholds = {
            excellent: 9.0,
            good: 7.5,
            acceptable: 6.0,
            poor: 4.0
        };
    }

    // === ANÁLISE PRINCIPAL ===
    async analyze(result) {
        const scores = {
            audio: await this.analyzeAudio(result.audio),
            visual: await this.analyzeVisual(result.images),
            script: await this.analyzeScript(result.script)
        };

        const weightedScore = (
            scores.audio * this.weights.audio +
            scores.visual * this.weights.visual +
            scores.script * this.weights.script
        );

        const analysis = {
            overall_score: weightedScore,
            breakdown: scores,
            quality_level: this.getQualityLevel(weightedScore),
            recommendations: this.generateRecommendations(scores),
            timestamp: Date.now()
        };

        console.log(`📊 Quality Analysis Complete:`);
        console.log(`   🎙️ Audio: ${scores.audio.toFixed(1)}/10`);
        console.log(`   🖼️ Visual: ${scores.visual.toFixed(1)}/10`);
        console.log(`   📝 Script: ${scores.script.toFixed(1)}/10`);
        console.log(`   🏆 Overall: ${weightedScore.toFixed(1)}/10 (${analysis.quality_level})`);

        return weightedScore;
    }

    // === ANÁLISE DE ÁUDIO ===
    async analyzeAudio(audioData) {
        if (!audioData || !audioData.path) {
            return 3.0; // Mock audio
        }

        let score = 5.0; // Base score

        // Service quality
        if (audioData.service === 'gemini-tts-premium') {
            score += 3.5; // Premium TTS
        } else if (audioData.service === 'gemini-tts') {
            score += 2.5; // Standard TTS
        } else if (audioData.service.includes('mock')) {
            score = 3.0; // Mock audio
        }

        // Voice quality indicators
        if (audioData.voice) {
            const premiumVoices = ['Kore', 'Zephyr', 'Charon', 'Gacrux'];
            if (premiumVoices.includes(audioData.voice)) {
                score += 0.5;
            }
        }

        // Duration check
        if (audioData.duration) {
            if (audioData.duration >= 120 && audioData.duration <= 300) {
                score += 0.5; // Good duration range
            } else if (audioData.duration < 60) {
                score -= 1.0; // Too short
            } else if (audioData.duration > 360) {
                score -= 0.5; // Too long
            }
        }

        // File size check (if available)
        try {
            if (audioData.path.endsWith('.wav') || audioData.path.endsWith('.mp3')) {
                const stats = await fs.stat(audioData.path);
                if (stats.size > 1000000) { // > 1MB suggests good quality
                    score += 0.3;
                }
            }
        } catch (error) {
            // File might not exist or be accessible
            score -= 1.0;
        }

        return Math.min(10.0, Math.max(1.0, score));
    }

    // === ANÁLISE VISUAL ===
    async analyzeVisual(imagesData) {
        if (!imagesData || !imagesData.paths || imagesData.paths.length === 0) {
            return 4.0; // No images
        }

        let score = 5.0; // Base score
        let validImages = 0;

        // Service quality
        if (imagesData.service === 'nano-banana' || imagesData.service === 'premium') {
            score += 2.0;
        } else if (imagesData.service === 'pollinations') {
            score += 1.5;
        } else if (imagesData.service === 'placeholder' || imagesData.service === 'failed') {
            score = 3.0;
        }

        // Count and validate images
        for (const imagePath of imagesData.paths) {
            try {
                const stats = await fs.stat(imagePath);
                
                if (imagePath.endsWith('.jpg') || imagePath.endsWith('.png')) {
                    validImages++;
                    
                    // Image size quality indicator
                    if (stats.size > 100000) { // > 100KB suggests good quality
                        score += 0.2;
                    } else if (stats.size < 10000) { // Very small image
                        score -= 0.3;
                    }
                } else {
                    // Text placeholder
                    score -= 0.5;
                }
            } catch (error) {
                score -= 0.5; // File doesn't exist or error
            }
        }

        // Image count bonus
        if (validImages >= 5) {
            score += 1.0; // Complete set
        } else if (validImages >= 3) {
            score += 0.5; // Partial set
        } else if (validImages === 0) {
            score = 2.0; // No valid images
        }

        // Average quality from metadata
        if (imagesData.avg_quality) {
            score = (score + imagesData.avg_quality) / 2;
        }

        return Math.min(10.0, Math.max(1.0, score));
    }

    // === ANÁLISE DE SCRIPT ===
    async analyzeScript(scriptData) {
        if (!scriptData || !scriptData.content) {
            return 4.0; // No script
        }

        let score = 5.0; // Base score

        const content = scriptData.content;
        const wordCount = content.split(/\s+/).length;

        // Length analysis
        if (wordCount >= 300 && wordCount <= 600) {
            score += 1.5; // Good length
        } else if (wordCount < 200) {
            score -= 1.0; // Too short
        } else if (wordCount > 800) {
            score -= 0.5; // Too long
        }

        // Structure analysis
        const hasTimestamps = /\[\d{2}:\d{2}\]/.test(content);
        if (hasTimestamps) {
            score += 1.0; // Well structured
        }

        // Hook strength (from metadata)
        if (scriptData.hook_strength) {
            score += (scriptData.hook_strength / 10) * 1.5;
        }

        // Retention score (from metadata)
        if (scriptData.retention_score) {
            score += (scriptData.retention_score / 10) * 1.0;
        }

        // Content quality indicators
        const engagementWords = [
            'mistério', 'incrível', 'surpreendente', 'descoberta',
            'segredo', 'revelação', 'fascinante', 'extraordinário'
        ];
        
        const engagementCount = engagementWords.filter(word => 
            content.toLowerCase().includes(word)
        ).length;
        
        score += Math.min(1.0, engagementCount * 0.2);

        // Question marks (engagement)
        const questionCount = (content.match(/\?/g) || []).length;
        if (questionCount >= 2 && questionCount <= 5) {
            score += 0.5; // Good engagement
        }

        // Image prompts quality
        if (scriptData.image_prompts && Array.isArray(scriptData.image_prompts)) {
            if (scriptData.image_prompts.length >= 5) {
                score += 0.5; // Complete image set
            }
            
            // Check prompt quality
            const avgPromptLength = scriptData.image_prompts.reduce((acc, prompt) => 
                acc + (prompt.prompt ? prompt.prompt.length : 0), 0
            ) / scriptData.image_prompts.length;
            
            if (avgPromptLength > 50) {
                score += 0.5; // Detailed prompts
            }
        }

        return Math.min(10.0, Math.max(1.0, score));
    }

    // === UTILIDADES ===
    getQualityLevel(score) {
        if (score >= this.thresholds.excellent) return 'EXCELLENT';
        if (score >= this.thresholds.good) return 'GOOD';
        if (score >= this.thresholds.acceptable) return 'ACCEPTABLE';
        if (score >= this.thresholds.poor) return 'POOR';
        return 'VERY_POOR';
    }

    generateRecommendations(scores) {
        const recommendations = [];

        if (scores.audio < 6.0) {
            recommendations.push('🎙️ Consider using Gemini TTS Premium for better audio quality');
        }

        if (scores.visual < 6.0) {
            recommendations.push('🖼️ Try premium image services or improve image prompts');
        }

        if (scores.script < 6.0) {
            recommendations.push('📝 Enhance script with more engaging content and better structure');
        }

        if (scores.audio > 8.5 && scores.visual > 8.5 && scores.script > 8.5) {
            recommendations.push('🏆 Excellent quality! Ready for publication');
        }

        return recommendations;
    }

    // === ANÁLISE BATCH ===
    async analyzeBatch(results) {
        const analyses = [];
        let totalScore = 0;

        for (const result of results) {
            if (result.success) {
                const score = await this.analyze(result);
                analyses.push({
                    executionId: result.executionId,
                    score: score,
                    level: this.getQualityLevel(score)
                });
                totalScore += score;
            }
        }

        const avgScore = analyses.length > 0 ? totalScore / analyses.length : 0;

        console.log(`\n📊 BATCH QUALITY ANALYSIS`);
        console.log(`========================`);
        console.log(`📈 Average Score: ${avgScore.toFixed(1)}/10`);
        console.log(`🏆 Quality Level: ${this.getQualityLevel(avgScore)}`);
        console.log(`✅ Videos Analyzed: ${analyses.length}`);
        
        const excellentCount = analyses.filter(a => a.level === 'EXCELLENT').length;
        const goodCount = analyses.filter(a => a.level === 'GOOD').length;
        const acceptableCount = analyses.filter(a => a.level === 'ACCEPTABLE').length;
        
        console.log(`🌟 Excellent: ${excellentCount} | Good: ${goodCount} | Acceptable: ${acceptableCount}`);
        console.log(`========================\n`);

        return {
            average_score: avgScore,
            analyses: analyses,
            distribution: {
                excellent: excellentCount,
                good: goodCount,
                acceptable: acceptableCount,
                poor: analyses.length - excellentCount - goodCount - acceptableCount
            }
        };
    }
}

module.exports = QualityAnalyzer;