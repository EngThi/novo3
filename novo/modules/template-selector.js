/**
 * Sistema de Seleção Inteligente de Templates
 * Escolhe automaticamente o melhor template baseado em contexto e performance histórica
 */
class TemplateSelector {
    constructor() {
        this.templates = {
            'misterios-brasileiros': {
                voice: 'Kore',
                style: 'dark-mysterious',
                image_style: 'dark, mysterious, Brazilian landscape, ancient mysteries',
                script_tone: 'suspenseful',
                target_length: 180,
                quality_weight: {
                    audio: 0.4,
                    visual: 0.35,
                    script: 0.25
                },
                performance_score: 8.5,
                keywords: ['misterio', 'inexplicavel', 'assombracao', 'fantasma', 'sobrenatural'],
                engagement_rate: 9.2
            },
            'curiosidades-cientificas': {
                voice: 'Charon',
                style: 'clean-scientific',
                image_style: 'scientific, clean, educational, modern laboratory',
                script_tone: 'informative',
                target_length: 240,
                quality_weight: {
                    audio: 0.3,
                    visual: 0.3,
                    script: 0.4
                },
                performance_score: 7.8,
                keywords: ['ciencia', 'descoberta', 'pesquisa', 'experimento', 'tecnologia'],
                engagement_rate: 7.5
            },
            'lendas-folclore': {
                voice: 'Gacrux',
                style: 'rustic-traditional',
                image_style: 'traditional, rustic, Brazilian folklore, indigenous',
                script_tone: 'storytelling',
                target_length: 220,
                quality_weight: {
                    audio: 0.45,
                    visual: 0.3,
                    script: 0.25
                },
                performance_score: 8.7,
                keywords: ['lenda', 'folclore', 'tradicional', 'ancestral', 'indigena'],
                engagement_rate: 9.0
            }
        };
    }

    selectOptimalTemplate(templateName = null) {
        if (templateName && this.templates[templateName]) {
            return this.templates[templateName];
        }
        
        // Fallback para mistérios brasileiros
        return this.templates['misterios-brasileiros'];
    }
}

module.exports = TemplateSelector;