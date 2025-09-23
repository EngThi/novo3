/**
 * Configuração Premium v2.0 - Gemini 2.5 Flash + Recursos Avançados
 * Sistema otimizado para máxima performance e qualidade profissional
 */

// === CONFIGURAÇÃO GEMINI 2.5 FLASH ===
const GEMINI_2_5_FLASH_CONFIG = {
    model: "gemini-2.5-flash",
    generationConfig: {
        temperature: 0.8,           // Criatividade moderada
        topK: 40,                   // Diversidade de tokens
        topP: 0.95,                 // Probabilidade núcleus
        maxOutputTokens: 8192,      // Resposta longa permitida
        responseMimeType: "application/json"  // JSON direto
    },
    safetySettings: [
        {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_ONLY_HIGH"
        },
        {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_ONLY_HIGH"
        },
        {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_ONLY_HIGH"
        },
        {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_ONLY_HIGH"
        }
    ]
};

// === TEMPLATES POR CATEGORIA ===
const VIDEO_TEMPLATES = {
    "misterios-brasileiros": {
        style: "dark_mysterious",
        mood: "suspense",
        color_palette: ["#1a0a0a", "#8B0000", "#DAA520", "#2F4F4F"],
        font_primary: "Creepster",
        font_secondary: "Arial Black", 
        transitions: {
            type: "fade_black",
            duration: 0.8,
            audio_fade: true
        },
        effects: {
            film_grain: true,
            vignette: 0.3,
            saturation: 0.7,
            contrast: 1.2
        },
        audio_processing: {
            reverb: "cave",
            eq_boost: "low_frequencies",
            compression: "dramatic"
        }
    },
    
    "historias-urbanas": {
        style: "modern_urban",
        mood: "contemporary", 
        color_palette: ["#2C2C2C", "#FF6B35", "#F7931E", "#4A90E2"],
        font_primary: "Roboto Slab",
        font_secondary: "Open Sans",
        transitions: {
            type: "slide_blur",
            duration: 0.5,
            direction: "left_to_right"
        },
        effects: {
            motion_blur: 0.2,
            chromatic_aberration: 0.1,
            lens_flare: true
        },
        audio_processing: {
            reverb: "studio",
            eq_boost: "mid_frequencies",
            compression: "moderate"
        }
    },
    
    "lendas-folclore": {
        style: "folklore_rustic",
        mood: "mystical",
        color_palette: ["#3B2F2F", "#8FBC8F", "#DEB887", "#CD853F"],
        font_primary: "Cinzel",
        font_secondary: "Libre Baskerville",
        transitions: {
            type: "cross_dissolve",
            duration: 1.2,
            organic: true
        },
        effects: {
            sepia_tone: 0.4,
            paper_texture: true,
            edge_enhancement: 0.3
        },
        audio_processing: {
            reverb: "forest",
            eq_boost: "warm_frequencies", 
            compression: "gentle"
        }
    }
};

// === CONFIGURAÇÃO DE TENDÊNCIAS ===
const TREND_SOURCES = {
    youtube_brasil: {
        enabled: true,
        endpoint: "https://www.googleapis.com/youtube/v3/videos",
        params: {
            part: "snippet,statistics",
            chart: "mostPopular", 
            regionCode: "BR",
            maxResults: 50,
            categoryId: "22" // People & Blogs
        },
        weight: 0.4
    },
    
    google_trends_brasil: {
        enabled: true,
        endpoint: "https://serpapi.com/search.json",
        params: {
            engine: "google_trends",
            geo: "BR",
            gprop: "youtube"
        },
        weight: 0.3
    },
    
    reddit_brasil: {
        enabled: true,
        subreddits: [
            "brasil", "brasilivre", "desabafos", 
            "eu_nvr", "circojeca", "futebol"
        ],
        endpoint: "https://www.reddit.com/r/{subreddit}/hot.json",
        weight: 0.2
    },
    
    twitter_trends_brasil: {
        enabled: false, // Opcional se tiver Twitter API
        endpoint: "https://api.twitter.com/1.1/trends/place.json",
        woeid: 23424768, // Brasil
        weight: 0.1
    }
};

// === FORMATOS DE SAÍDA ===
const OUTPUT_FORMATS = {
    youtube_landscape: {
        resolution: { width: 1920, height: 1080 },
        fps: 30,
        bitrate: "5000k",
        audio_bitrate: "192k",
        format: "mp4",
        h264_preset: "slow", // Melhor qualidade
        priority: 1
    },
    
    youtube_shorts: {
        resolution: { width: 1080, height: 1920 },
        fps: 30,
        bitrate: "3500k", 
        audio_bitrate: "128k",
        format: "mp4",
        h264_preset: "fast", // Upload rápido
        priority: 2,
        special_effects: {
            captions: true,
            hook_timer: "3_seconds"
        }
    },
    
    instagram_reel: {
        resolution: { width: 1080, height: 1920 },
        fps: 30,
        bitrate: "3000k",
        audio_bitrate: "128k", 
        format: "mp4",
        duration_limit: 60, // máximo Instagram
        priority: 3
    },
    
    tiktok: {
        resolution: { width: 1080, height: 1920 },
        fps: 30,
        bitrate: "2500k",
        audio_bitrate: "128k",
        format: "mp4", 
        duration_limit: 180, // 3 minutos TikTok
        priority: 4,
        special_effects: {
            trending_sounds: true,
            auto_captions: true
        }
    }
};

// === CONFIGURAÇÃO TTS BRASILEIRO PREMIUM ===
const BRAZILIAN_TTS_CONFIG = {
    primary_voices: [
        {
            service: "coqui_xtts_v2",
            voice_id: "ana_brazilian_narrator",
            quality: "premium",
            emotional_range: ["neutral", "excited", "mysterious", "dramatic"],
            speed_range: [0.8, 1.2],
            pitch_range: [-0.1, 0.1]
        },
        {
            service: "higgs_audio_v2_ptbr", 
            voice_id: "brazilian_professional_female",
            quality: "state_of_art",
            local: true,
            gpu_required: true
        }
    ],
    
    fallback_voices: [
        {
            service: "gtts",
            lang: "pt-BR",
            quality: "good",
            free: true
        },
        {
            service: "espeak",
            voice: "pt-br",
            quality: "basic",
            local: true
        }
    ]
};

// === OTIMIZAÇÕES DE CACHE ===
const CACHE_CONFIG = {
    embeddings: {
        model: "sentence-transformers/all-MiniLM-L6-v2",
        similarity_threshold: 0.85,
        max_cache_size: "1GB"
    },
    
    assets: {
        images: {
            max_age_days: 30,
            compression: "lossless",
            formats: ["png", "webp"]
        },
        audio: {
            max_age_days: 15,
            quality: "320kbps",
            formats: ["mp3", "opus"]
        }
    }
};

// === MONITORAMENTO E ALERTAS ===
const MONITORING_CONFIG = {
    discord: {
        webhook_url: process.env.DISCORD_WEBHOOK_URL,
        notifications: {
            pipeline_start: true,
            pipeline_complete: true,
            api_quota_warning: true,
            performance_metrics: true,
            error_alerts: true
        }
    },
    
    metrics: {
        track_costs: true,
        track_performance: true,
        track_quality_scores: true,
        generate_reports: true,
        report_frequency: "daily"
    }
};

module.exports = {
    GEMINI_2_5_FLASH_CONFIG,
    VIDEO_TEMPLATES,
    TREND_SOURCES,
    OUTPUT_FORMATS,
    BRAZILIAN_TTS_CONFIG,
    CACHE_CONFIG,
    MONITORING_CONFIG
};