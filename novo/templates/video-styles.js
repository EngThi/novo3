/**
 * Sistema de Estilos de Vídeo Profissionais
 * Configurações visuais otimizadas para diferentes nichos de conteúdo
 */

class VideoStyles {
    constructor() {
        this.styles = {
            // === MISTÉRIOS BRASILEIROS ===
            'misterios-brasileiros': {
                visual: {
                    color_palette: ['#1a1a2e', '#16213e', '#0f3460', '#533483'],
                    background_style: 'dark-atmospheric',
                    image_treatment: 'desaturated',
                    vignette: 'heavy',
                    contrast: 'high'
                },
                transitions: {
                    primary: 'fade',
                    secondary: 'dissolve',
                    duration: 1.2,
                    easing: 'ease-in-out'
                },
                effects: {
                    zoom_intensity: 1.3,
                    pan_speed: 'slow',
                    blur_background: true,
                    grain_effect: 'light',
                    shadow_depth: 'deep'
                },
                typography: {
                    font_family: 'Arial Black',
                    title_color: '#ffffff',
                    subtitle_color: '#cccccc',
                    drop_shadow: true
                },
                audio: {
                    background_music: 'dark-ambient',
                    sound_effects: ['whoosh', 'reverb'],
                    voice_processing: 'atmospheric'
                }
            },
            
            // === CURIOSIDADES CIENTÍFICAS ===
            'curiosidades-cientificas': {
                visual: {
                    color_palette: ['#ffffff', '#f8f9fa', '#e3f2fd', '#2196f3'],
                    background_style: 'clean-modern',
                    image_treatment: 'vibrant',
                    vignette: 'subtle',
                    contrast: 'balanced'
                },
                transitions: {
                    primary: 'slide',
                    secondary: 'wipe',
                    duration: 0.8,
                    easing: 'ease-out'
                },
                effects: {
                    zoom_intensity: 1.1,
                    pan_speed: 'medium',
                    blur_background: false,
                    grain_effect: 'none',
                    shadow_depth: 'light'
                },
                typography: {
                    font_family: 'Helvetica',
                    title_color: '#1976d2',
                    subtitle_color: '#424242',
                    drop_shadow: false
                },
                audio: {
                    background_music: 'upbeat-corporate',
                    sound_effects: ['pop', 'chime'],
                    voice_processing: 'clear'
                }
            },
            
            // === LENDAS E FOLCLORE ===
            'lendas-folclore': {
                visual: {
                    color_palette: ['#3e2723', '#5d4037', '#8d6e63', '#a1887f'],
                    background_style: 'earthy-rustic',
                    image_treatment: 'warm',
                    vignette: 'medium',
                    contrast: 'soft'
                },
                transitions: {
                    primary: 'dissolve',
                    secondary: 'fade',
                    duration: 1.5,
                    easing: 'ease-in-out'
                },
                effects: {
                    zoom_intensity: 1.2,
                    pan_speed: 'slow',
                    blur_background: false,
                    grain_effect: 'vintage',
                    shadow_depth: 'medium'
                },
                typography: {
                    font_family: 'Georgia',
                    title_color: '#5d4037',
                    subtitle_color: '#8d6e63',
                    drop_shadow: true
                },
                audio: {
                    background_music: 'folk-acoustic',
                    sound_effects: ['nature', 'fire'],
                    voice_processing: 'warm'
                }
            },
            
            // === HISTÓRIAS URBANAS ===
            'historias-urbanas': {
                visual: {
                    color_palette: ['#212121', '#424242', '#757575', '#bdbdbd'],
                    background_style: 'urban-modern',
                    image_treatment: 'sharp',
                    vignette: 'light',
                    contrast: 'medium'
                },
                transitions: {
                    primary: 'slide',
                    secondary: 'zoom',
                    duration: 0.9,
                    easing: 'ease-in-out'
                },
                effects: {
                    zoom_intensity: 1.15,
                    pan_speed: 'fast',
                    blur_background: false,
                    grain_effect: 'digital',
                    shadow_depth: 'sharp'
                },
                typography: {
                    font_family: 'Roboto',
                    title_color: '#ffffff',
                    subtitle_color: '#bdbdbd',
                    drop_shadow: true
                },
                audio: {
                    background_music: 'urban-beat',
                    sound_effects: ['synth', 'bass'],
                    voice_processing: 'modern'
                }
            },
            
            // === ENTRETENIMENTO VIRAL ===
            'entretenimento-viral': {
                visual: {
                    color_palette: ['#ff5722', '#ff9800', '#ffc107', '#ffeb3b'],
                    background_style: 'energetic-colorful',
                    image_treatment: 'saturated',
                    vignette: 'none',
                    contrast: 'high'
                },
                transitions: {
                    primary: 'zoom',
                    secondary: 'slide',
                    duration: 0.6,
                    easing: 'ease-out'
                },
                effects: {
                    zoom_intensity: 1.4,
                    pan_speed: 'fast',
                    blur_background: false,
                    grain_effect: 'none',
                    shadow_depth: 'dynamic'
                },
                typography: {
                    font_family: 'Impact',
                    title_color: '#ff5722',
                    subtitle_color: '#ff9800',
                    drop_shadow: true
                },
                audio: {
                    background_music: 'energetic-pop',
                    sound_effects: ['whoosh', 'impact'],
                    voice_processing: 'dynamic'
                }
            }
        };
    }
    
    // === MÉTODOS PÚBLICOS ===
    getStyle(templateName) {
        return this.styles[templateName] || this.styles['misterios-brasileiros'];
    }
    
    getAllStyles() {
        return Object.keys(this.styles);
    }
    
    // === FFmpeg FILTER GENERATION ===
    generateFFmpegFilters(styleName, options = {}) {
        const style = this.getStyle(styleName);
        const filters = [];
        
        // Filtro de cor baseado no estilo
        if (style.visual.image_treatment === 'desaturated') {
            filters.push('eq=saturation=0.7:contrast=1.2');
        } else if (style.visual.image_treatment === 'saturated') {
            filters.push('eq=saturation=1.3:contrast=1.1');
        } else if (style.visual.image_treatment === 'warm') {
            filters.push('colorbalance=rs=0.1:gs=0:bs=-0.1');
        }
        
        // Vinheta
        if (style.visual.vignette !== 'none') {
            const intensity = {
                'light': 0.3,
                'medium': 0.5,
                'heavy': 0.7,
                'subtle': 0.2
            }[style.visual.vignette] || 0.3;
            
            filters.push(`vignette=PI/4*${intensity}`);
        }
        
        // Grain effect
        if (style.effects.grain_effect && style.effects.grain_effect !== 'none') {
            const grainMap = {
                'light': 'noise=alls=10:allf=t',
                'vintage': 'noise=alls=15:allf=t+u',
                'digital': 'noise=alls=5:allf=t'
            };
            
            if (grainMap[style.effects.grain_effect]) {
                filters.push(grainMap[style.effects.grain_effect]);
            }
        }
        
        return filters.join(',');
    }
    
    // === ZOOM E PAN SETTINGS ===
    getZoomPanSettings(styleName, duration) {
        const style = this.getStyle(styleName);
        
        const zoomSettings = {
            intensity: style.effects.zoom_intensity || 1.2,
            duration: Math.round(duration * 30), // Convert to frames
            direction: 'in' // zoom in
        };
        
        const panSettings = {
            speed: {
                'slow': 0.001,
                'medium': 0.002,
                'fast': 0.004
            }[style.effects.pan_speed] || 0.002,
            direction: Math.random() > 0.5 ? 'right' : 'left'
        };
        
        return { zoom: zoomSettings, pan: panSettings };
    }
    
    // === CUSTOMIZAÇÃO ===
    createCustomStyle(name, baseStyle, customizations) {
        const base = this.getStyle(baseStyle);
        const custom = JSON.parse(JSON.stringify(base)); // Deep copy
        
        // Aplicar customizações
        Object.keys(customizations).forEach(key => {
            if (custom[key]) {
                Object.assign(custom[key], customizations[key]);
            }
        });
        
        this.styles[name] = custom;
        console.log(`🎨 Estilo customizado criado: ${name}`);
        
        return custom;
    }
    
    // === EXPORT PARA FFMPEG ===
    exportForFFmpeg(styleName, imageCount, totalDuration) {
        const style = this.getStyle(styleName);
        const imageDuration = totalDuration / imageCount;
        
        return {
            style_name: styleName,
            image_duration: imageDuration,
            transition_duration: style.transitions.duration,
            transition_type: style.transitions.primary,
            filters: this.generateFFmpegFilters(styleName),
            zoom_pan: this.getZoomPanSettings(styleName, imageDuration),
            audio_processing: style.audio
        };
    }
}

module.exports = VideoStyles;