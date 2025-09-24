const axios = require('axios');
const fs = require('fs');
const path = require('path');
const CredentialManager = require('./credential-manager');

/**
 * Sistema TTS Premium com vozes Gemini 2.5 Flash
 * Baseado no sistema HTML com 30+ vozes profissionais e rotação de API keys
 */
class GeminiTTSPremium {
    constructor(options = {}) {
        this.credentialManager = new CredentialManager();
        this.currentApiKeyIndex = 0;
        this.cancelRequested = false;
        
        // Configurações
        this.voice = options.voice || process.env.TTS_VOICE_PRIMARY || 'Zephyr';
        this.chunkSize = options.chunkSize || 800; // palavras por chunk
        this.sampleRate = 24000; // Padrão Gemini TTS
        this.apiKeys = [];
        
        // Métricas
        this.metrics = {
            chunks_processed: 0,
            api_calls: 0,
            total_duration: 0,
            failed_chunks: 0
        };
        
        this.loadApiKeys();
    }

    // === PERFIS DE VOZ GEMINI 2.5 FLASH ===
    static VOICE_PROFILES = {
        // VOZES FEMININAS CLARAS (Narrativas profissionais)
        "Zephyr": { 
            gender: "feminina", tone: "clara", style: "profissional", 
            ideal_for: "documentários", description: "Clara e profissional" 
        },
        "Erinome": { 
            gender: "feminina", tone: "clara", style: "direta", 
            ideal_for: "notícias", description: "Clara e direta" 
        },
        "Iapetus": { 
            gender: "feminina", tone: "nítida", style: "precisa", 
            ideal_for: "tutoriais", description: "Nítida e precisa" 
        },
        
        // VOZES FEMININAS SUAVES (Narrativas envolventes)
        "Algieba": { 
            gender: "feminina", tone: "suave", style: "envolvente", 
            ideal_for: "histórias", description: "Suave e envolvente" 
        },
        "Despina": { 
            gender: "feminina", tone: "suave", style: "acolhedora", 
            ideal_for: "relaxamento", description: "Suave e acolhedora" 
        },
        "Achernar": { 
            gender: "feminina", tone: "suave", style: "elegante", 
            ideal_for: "cultura", description: "Suave e elegante" 
        },
        
        // VOZES ANIMADAS (Conteúdo dinâmico)
        "Puck": { 
            gender: "feminina", tone: "animada", style: "energética", 
            ideal_for: "entretenimento", description: "Animada e energética" 
        },
        "Fenrir": { 
            gender: "feminina", tone: "excitada", style: "vibrante", 
            ideal_for: "curiosidades", description: "Excitada e vibrante" 
        },
        "Laomedeia": { 
            gender: "feminina", tone: "animada", style: "jovem", 
            ideal_for: "viral", description: "Animada e jovem" 
        },
        "Leda": { 
            gender: "feminina", tone: "jovem", style: "dinâmica", 
            ideal_for: "trending", description: "Jovem e dinâmica" 
        },
        
        // VOZES MASCULINAS FIRMES (Autoridade)
        "Kore": { 
            gender: "masculina", tone: "firme", style: "autoritária", 
            ideal_for: "mistérios", description: "Firme e autoritária" 
        },
        "Orus": { 
            gender: "masculina", tone: "firme", style: "segura", 
            ideal_for: "investigação", description: "Firme e segura" 
        },
        "Alnilam": { 
            gender: "masculina", tone: "firme", style: "confiável", 
            ideal_for: "facts", description: "Firme e confiável" 
        },
        "Algenib": { 
            gender: "masculina", tone: "grave", style: "séria", 
            ideal_for: "documentários", description: "Grave e séria" 
        },
        
        // VOZES TRANQUILAS (Narrativas relaxantes)
        "Callirrhoe": { 
            gender: "feminina", tone: "tranquila", style: "serena", 
            ideal_for: "meditação", description: "Tranquila e serena" 
        },
        "Umbriel": { 
            gender: "feminina", tone: "tranquila", style: "suave", 
            ideal_for: "histórias", description: "Tranquila e suave" 
        },
        
        // VOZES ESPECIAIS
        "Charon": { 
            gender: "neutra", tone: "informativa", style: "jornalística", 
            ideal_for: "documentários", description: "Informativa e jornalística" 
        },
        "Gacrux": { 
            gender: "feminina", tone: "madura", style: "experiente", 
            ideal_for: "história", description: "Madura e experiente" 
        },
        "Rasalgethi": { 
            gender: "masculina", tone: "informativa", style: "educativa", 
            ideal_for: "ciência", description: "Informativa e educativa" 
        },
        
        // VOZES ADICIONAIS
        "Aoede": { 
            gender: "feminina", tone: "leve", style: "melódica", 
            ideal_for: "arte", description: "Leve e melódica" 
        },
        "Autonoe": { 
            gender: "feminina", tone: "brilhante", style: "vivaz", 
            ideal_for: "educativo", description: "Brilhante e vivaz" 
        },
        "Enceladus": { 
            gender: "masculina", tone: "suspirante", style: "dramática", 
            ideal_for: "drama", description: "Suspirante e dramática" 
        },
        "Achird": { 
            gender: "feminina", tone: "amigável", style: "calorosa", 
            ideal_for: "conversas", description: "Amigável e calorosa" 
        },
        "Zubenelgenubi": { 
            gender: "masculina", tone: "casual", style: "descontraída", 
            ideal_for: "lifestyle", description: "Casual e descontraída" 
        },
        "Vindemiatrix": { 
            gender: "feminina", tone: "gentil", style: "carinhosa", 
            ideal_for: "família", description: "Gentil e carinhosa" 
        },
        "Sadachbia": { 
            gender: "feminina", tone: "vívida", style: "expressiva", 
            ideal_for: "arte", description: "Vívida e expressiva" 
        },
        "Sadaltager": { 
            gender: "feminina", tone: "conhecedora", style: "sábia", 
            ideal_for: "educação", description: "Conhecedora e sábia" 
        },
        "Sulafat": { 
            gender: "feminina", tone: "acolhedora", style: "maternal", 
            ideal_for: "histórias", description: "Acolhedora e maternal" 
        },
        "Schedar": { 
            gender: "feminina", tone: "uniforme", style: "consistente", 
            ideal_for: "podcast", description: "Uniforme e consistente" 
        },
        "Pulcherrima": { 
            gender: "feminina", tone: "direta", style: "objetiva", 
            ideal_for: "negócios", description: "Direta e objetiva" 
        }
    };

    // === SELEÇÃO AUTOMÁTICA DE VOZ ===
    static selectOptimalVoice(contentType, scriptText = "") {
        const voiceMap = {
            "misterios-brasileiros": "Kore",       // Masculina firme para mistérios
            "historias-urbanas": "Zephyr",         // Feminina clara para histórias
            "lendas-folclore": "Gacrux",           // Madura experiente para lendas
            "curiosidades": "Puck",               // Animada para curiosidades
            "documentarios": "Charon",             // Informativa para docs
            "ciencia": "Rasalgethi",              // Educativa masculina
            "entretenimento": "Fenrir",           // Vibrante para entretenimento
            "educativo": "Autonoe",               // Brilhante para educação
            "relaxamento": "Callirrhoe",          // Tranquila para relaxamento
            "noticias": "Erinome",                // Clara direta para notícias
            "tutorial": "Iapetus"                 // Nítida precisa para tutoriais
        };
        
        let selectedVoice = voiceMap[contentType] || process.env.TTS_VOICE_PRIMARY || 'Zephyr';
        
        // Análise do texto para otimização
        if (scriptText) {
            const text = scriptText.toLowerCase();
            
            // Palavras que sugerem diferentes vozes
            if (text.includes('mistério') || text.includes('assombra') || text.includes('inexplicável')) {
                selectedVoice = 'Kore'; // Masculina autoritária
            } else if (text.includes('criança') || text.includes('família') || text.includes('história')) {
                selectedVoice = 'Sulafat'; // Feminina maternal
            } else if (text.includes('ciência') || text.includes('pesquisa') || text.includes('estudo')) {
                selectedVoice = 'Rasalgethi'; // Masculina educativa
            } else if (text.includes('incrível') || text.includes('surpreendente') || text.includes('viral')) {
                selectedVoice = 'Puck'; // Feminina animada
            }
        }
        
        return selectedVoice;
    }

    // === CARREGAMENTO DE API KEYS ===
    async loadApiKeys() {
        try {
            // Tentar obter de credenciais gerenciadas
            const credentials = await this.credentialManager.getUsageStats('gemini');
            if (credentials.gemini && credentials.gemini.credentials.length > 0) {
                this.apiKeys = credentials.gemini.credentials
                    .filter(cred => cred.active)
                    .map(cred => ({
                        key: cred.id, // Será descriptografado pelo credential manager
                        hasCredits: true,
                        status: 'Aguardando',
                        color: 'text-gray-400'
                    }));
            }
            
            // Fallback para variáveis de ambiente
            if (this.apiKeys.length === 0) {
                const envKeys = [];
                for (let i = 1; i <= 10; i++) {
                    const key = process.env[`GEMINI_API_KEY${i > 1 ? '_' + i : ''}`];
                    if (key) envKeys.push(key);
                }
                
                this.apiKeys = envKeys.map(key => ({
                    key: key.trim(),
                    hasCredits: true,
                    status: 'Aguardando',
                    color: 'text-gray-400'
                }));
            }
            
            console.log(`🔑 ${this.apiKeys.length} API keys carregadas para Gemini TTS`);
        } catch (error) {
            console.error('Erro ao carregar API keys:', error.message);
            this.apiKeys = [];
        }
    }

    // === CHUNKING INTELIGENTE (baseado no código HTML) ===
    createIntelligentChunks(script, maxWords = 800) {
        const words = script.split(/\s+/);
        const chunks = [];
        let currentChunk = "";
        let wordsInChunk = 0;
        const sentenceEnders = /[.?!]/;
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            currentChunk += (currentChunk ? ' ' : '') + word;
            wordsInChunk++;
            
            // Quebra em chunks de até 800 palavras no fim de sentença
            if (wordsInChunk >= maxWords) {
                let endOfSentenceIndex = -1;
                
                // Procura fim de sentença nos últimos 100 palavras
                for (let j = i; j > i - 100 && j >= 0; j--) {
                    if (sentenceEnders.test(words[j].trim())) {
                        endOfSentenceIndex = j;
                        break;
                    }
                }
                
                if (endOfSentenceIndex !== -1 && endOfSentenceIndex > i - 200) {
                    const chunkToPush = words.slice(i - wordsInChunk + 1, endOfSentenceIndex + 1).join(' ');
                    chunks.push(chunkToPush);
                    currentChunk = words.slice(endOfSentenceIndex + 1, i + 1).join(' ');
                    wordsInChunk = words.slice(endOfSentenceIndex + 1, i + 1).length;
                } else {
                    chunks.push(currentChunk);
                    currentChunk = "";
                    wordsInChunk = 0;
                }
            }
        }
        
        if (currentChunk) chunks.push(currentChunk);
        
        console.log(`📝 Texto dividido em ${chunks.length} chunks inteligentes`);
        return chunks;
    }

    // === GERAÇÃO DE ÁUDIO GEMINI ===
    async generateAudioChunk(text, voice) {
        const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=";
        const currentApi = this.apiKeys[this.currentApiKeyIndex];
        
        if (!currentApi || !currentApi.hasCredits) {
            return null;
        }
        
        const payload = {
            contents: [{ parts: [{ text: text }] }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voice }
                    }
                }
            },
            model: "gemini-2.5-flash-preview-tts"
        };
        
        try {
            const response = await axios.post(`${API_URL}${currentApi.key}`, payload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 60000
            });
            
            if (!response.data) {
                throw new Error('Resposta vazia da API');
            }
            
            const result = response.data;
            const part = result?.candidates?.[0]?.content?.parts?.[0];
            const audioData = part?.inlineData?.data;
            
            if (audioData) {
                currentApi.status = 'Em uso';
                currentApi.color = 'text-green-500';
                this.metrics.api_calls++;
                return audioData;
            } else {
                currentApi.status = 'Falhou (resposta inválida)';
                currentApi.hasCredits = false;
                currentApi.color = 'text-red-500';
                throw new Error('Dados de áudio não encontrados na resposta');
            }
            
        } catch (error) {
            console.error(`Erro na API key ${this.currentApiKeyIndex + 1}:`, error.message);
            
            if (error.response?.status === 429 || error.response?.status === 403) {
                currentApi.status = 'Sem Crédito';
                currentApi.hasCredits = false;
                currentApi.color = 'text-red-500';
            } else {
                currentApi.status = 'Erro de API';
                currentApi.hasCredits = false;
                currentApi.color = 'text-red-500';
            }
            
            return null;
        }
    }

    // === CONVERSÃO PCM PARA WAV (baseado no código HTML) ===
    base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
    
    pcmToWav(pcmData, sampleRate = 24000) {
        const dataLength = pcmData.length * 2;
        const buffer = new ArrayBuffer(44 + dataLength);
        const view = new DataView(buffer);
        let offset = 0;
        
        function writeString(view, offset, string) {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        }
        
        writeString(view, offset, 'RIFF'); offset += 4;
        view.setUint32(offset, 36 + dataLength, true); offset += 4;
        writeString(view, offset, 'WAVE'); offset += 4;
        writeString(view, offset, 'fmt '); offset += 4;
        view.setUint32(offset, 16, true); offset += 4;
        view.setUint16(offset, 1, true); offset += 2; // PCM
        view.setUint16(offset, 1, true); offset += 2; // Número de canais
        view.setUint32(offset, sampleRate, true); offset += 4;
        view.setUint32(offset, sampleRate * 2, true); offset += 4;
        view.setUint16(offset, 2, true); offset += 2; // Block align
        view.setUint16(offset, 16, true); offset += 2; // Bits por amostra
        writeString(view, offset, 'data'); offset += 4;
        view.setUint32(offset, dataLength, true); offset += 4;
        
        for (let i = 0; i < pcmData.length; i++) {
            view.setInt16(offset + i * 2, pcmData[i], true);
        }
        
        return buffer;
    }

    // === PROCESSAMENTO PRINCIPAL ===
    async generateFromScript(script, contentType = null, outputDir = './output') {
        console.log(`🎙️ Iniciando geração TTS com voz: ${this.voice}`);
        
        if (this.apiKeys.length === 0) {
            throw new Error('Nenhuma API key disponível para Gemini TTS');
        }
        
        // Seleção automática de voz se não especificada
        if (contentType && process.env.TTS_AUTO_SELECT === 'true') {
            this.voice = GeminiTTSPremium.selectOptimalVoice(contentType, script);
            console.log(`🤖 Voz selecionada automaticamente: ${this.voice} (${GeminiTTSPremium.VOICE_PROFILES[this.voice]?.description})`);
        }
        
        // Criar chunks inteligentes
        const chunks = this.createIntelligentChunks(script, this.chunkSize);
        const audioSegments = [];
        
        console.log(`⚡ Processando ${chunks.length} chunks com voz ${this.voice}...`);
        
        for (let i = 0; i < chunks.length; i++) {
            if (this.cancelRequested) {
                console.log('❌ Processo cancelado pelo usuário');
                break;
            }
            
            const chunk = chunks[i];
            console.log(`   📝 Chunk ${i + 1}/${chunks.length}: ${chunk.substring(0, 50)}...`);
            
            let audioData = null;
            let attempts = 0;
            
            // Tenta com todas as API keys disponíveis
            while (!audioData && attempts < this.apiKeys.length) {
                audioData = await this.generateAudioChunk(chunk, this.voice);
                if (!audioData) {
                    this.currentApiKeyIndex = (this.currentApiKeyIndex + 1) % this.apiKeys.length;
                    attempts++;
                }
            }
            
            if (audioData) {
                const arrayBuffer = this.base64ToArrayBuffer(audioData);
                const pcm16 = new Int16Array(arrayBuffer);
                audioSegments.push(pcm16);
                this.metrics.chunks_processed++;
                
                console.log(`   ✅ Chunk ${i + 1} processado (${pcm16.length} samples)`);
            } else {
                console.error(`   ❌ Falha no chunk ${i + 1} - todas as API keys falharam`);
                this.metrics.failed_chunks++;
            }
            
            // Pequeno delay entre chunks para não sobrecarregar a API
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (audioSegments.length === 0) {
            throw new Error('Nenhum chunk de áudio foi gerado com sucesso');
        }
        
        // Combinar todos os segments PCM
        const totalLength = audioSegments.reduce((acc, segment) => acc + segment.length, 0);
        const combinedPCM = new Int16Array(totalLength);
        
        let offset = 0;
        for (const segment of audioSegments) {
            combinedPCM.set(segment, offset);
            offset += segment.length;
        }
        
        // Converter para WAV
        const wavBuffer = this.pcmToWav(combinedPCM, this.sampleRate);
        
        // Salvar arquivo
        const timestamp = Date.now();
        const voiceProfile = GeminiTTSPremium.VOICE_PROFILES[this.voice];
        const filename = `narration_${this.voice.toLowerCase()}_${timestamp}.wav`;
        const outputPath = path.join(outputDir, filename);
        
        // Garantir que diretório existe
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, Buffer.from(wavBuffer));
        
        // Calcular duração aproximada (samples / sample_rate)
        const durationSeconds = combinedPCM.length / this.sampleRate;
        this.metrics.total_duration = durationSeconds;
        
        const result = {
            localPath: outputPath,
            service: 'gemini-2.5-flash-tts',
            voice: this.voice,
            voiceProfile: voiceProfile,
            quality: 'premium',
            duration: durationSeconds,
            chunks: audioSegments.length,
            metrics: this.metrics
        };
        
        console.log(`🎉 TTS concluído!`);
        console.log(`   🎙️ Voz: ${this.voice} (${voiceProfile?.description})`);
        console.log(`   ⏱️ Duração: ${durationSeconds.toFixed(1)}s`);
        console.log(`   📊 Chunks: ${audioSegments.length}/${chunks.length}`);
        console.log(`   📁 Arquivo: ${outputPath}`);
        
        return result;
    }

    // === MÉTODOS AUXILIARES ===
    cancelGeneration() {
        this.cancelRequested = true;
        console.log('🛑 Cancelamento solicitado...');
    }
    
    getMetrics() {
        return this.metrics;
    }
    
    getAvailableVoices() {
        return GeminiTTSPremium.VOICE_PROFILES;
    }
    
    setVoice(voice) {
        if (GeminiTTSPremium.VOICE_PROFILES[voice]) {
            this.voice = voice;
            console.log(`🎙️ Voz alterada para: ${voice} (${GeminiTTSPremium.VOICE_PROFILES[voice].description})`);
        } else {
            console.warn(`⚠️ Voz '${voice}' não encontrada. Usando ${this.voice}`);
        }
    }
    
    // Compatibilidade com interface anterior
    async generateAudio(script, outputDir, executionId, options = {}) {
        const contentType = options.contentType || 'misterios-brasileiros';
        const result = await this.generateFromScript(script, contentType, outputDir);
        
        return {
            localPath: result.localPath,
            service: result.service,
            quality: result.quality,
            voice: result.voice,
            language: 'pt-BR',
            duration: result.duration
        };
    }
}

module.exports = GeminiTTSPremium;