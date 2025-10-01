const axios = require('axios');
const fs = require('fs');
const path = require('path');

class GeminiTTSPremium {
    constructor(dependencies) {
        this.logger = dependencies.logger || console;
        
        // CARREGAR CHAVES GEMINI DO .ENV
        this.geminiKeys = [
            process.env.GEMINI_API_KEY,
            process.env.GEMINI_API_KEY_2,
            process.env.GEMINI_API_KEY_3,
            process.env.GEMINI_API_KEY_4,
            process.env.GEMINI_API_KEY_5
        ].filter(key => key && key.length > 20);
        
        this.currentKeyIndex = 0;
        this.audioOutputDir = '/home/user/main/novo3/novo/outputs/audio';
        
        // VOZES PREMIUM DISPONÍVEIS
        this.voicesAvailable = {
            // PRINCIPAIS RECOMENDADAS
            'Kore': 'Firme - Ideal para notícias e conteúdo sério',
            'Zephyr': 'Clara - Versátil para todos os tipos',
            'Puck': 'Animada - Boa para conteúdo jovem',
            'Charon': 'Informativa - Perfeita para tutoriais',
            'Fenrir': 'Excitada - Para conteúdo energético',
            'Leda': 'Jovem',
            'Orus': 'Firme',
            'Aoede': 'Leve',
            'Callirrhoe': 'Tranquila',
            'Autonoe': 'Brilhante'
        };
        
        this.defaultVoice = 'Kore';
        this.maxWordsPerBlock = 400;
        
        this.ensureDirectories();
        
        console.log('🎙️ Gemini TTS Premium V6.0');
        console.log(`   🔑 Chaves disponíveis: ${this.geminiKeys.length}`);
        console.log(`   🎭 Vozes disponíveis: ${Object.keys(this.voicesAvailable).length}`);
        console.log(`   🎤 Voz padrão: ${this.defaultVoice}`);
    }
    
    ensureDirectories() {
        if (!fs.existsSync(this.audioOutputDir)) {
            fs.mkdirSync(this.audioOutputDir, { recursive: true });
        }
    }
    
    async gerarNarracaoCompleta(texto, opcoes = {}) {
        const {
            voz = this.defaultVoice,
            jobId = `tts-${Date.now()}`,
            qualidade = 'premium'
        } = opcoes;
        
        try {
            console.log(`🎙️ Iniciando narração completa...`);
            console.log(`   📝 Texto: ${texto.length} caracteres`);
            console.log(`   🎭 Voz: ${voz}`);
            console.log(`   🔑 Chaves: ${this.geminiKeys.length}`);
            
            // DIVIDIR TEXTO EM BLOCOS INTELIGENTES
            const blocos = this.dividirTextoInteligente(texto);
            console.log(`   📦 Blocos gerados: ${blocos.length}`);
            
            // GERAR ÁUDIO PARA CADA BLOCO
            const segmentosAudio = [];
            
            for (let i = 0; i < blocos.length; i++) {
                console.log(`🎤 Gerando bloco ${i + 1}/${blocos.length}...`);
                
                const audioData = await this.gerarAudioBloco(blocos[i], voz, `${jobId}_bloco${i + 1}`);
                
                if (audioData) {
                    segmentosAudio.push(audioData);
                    console.log(`✅ Bloco ${i + 1}: ${audioData.fileSizeKB}KB`);
                } else {
                    console.log(`❌ Bloco ${i + 1}: Falhou`);
                    // Criar um silêncio se falhar
                    const silencio = await this.criarSilencio(`${jobId}_bloco${i + 1}`);
                    segmentosAudio.push(silencio);
                }
            }
            
            // COMBINAR TODOS OS SEGMENTOS
            console.log(`🔗 Combinando ${segmentosAudio.length} segmentos...`);
            const audioFinal = await this.combinarSegmentos(segmentosAudio, jobId);
            
            console.log(`✅ Narração completa gerada: ${audioFinal.filename}`);
            
            return {
                success: true,
                audioPath: audioFinal.audioPath,
                audioUrl: audioFinal.audioUrl,
                filename: audioFinal.filename,
                fileSize: audioFinal.fileSize,
                fileSizeKB: audioFinal.fileSizeKB,
                duration: audioFinal.duration,
                voz: voz,
                blocos: segmentosAudio.length,
                qualidade: 'Premium Gemini TTS'
            };
            
        } catch (error) {
            console.log(`❌ Erro na geração de narração: ${error.message}`);
            throw error;
        }
    }
    
    dividirTextoInteligente(texto) {
        const blocos = [];
        const palavras = texto.split(/\s+/);
        const finalizadores = /[.?!]/;
        
        let blocoAtual = "";
        let palavrasNoBLoco = 0;
        
        for (let i = 0; i < palavras.length; i++) {
            const palavra = palavras[i];
            blocoAtual += (blocoAtual ? ' ' : '') + palavra;
            palavrasNoBLoco++;
            
            // Se chegou no limite de palavras, procurar melhor ponto de quebra
            if (palavrasNoBLoco >= this.maxWordsPerBlock) {
                let melhorQuebra = -1;
                
                // Procurar ponto final nos últimos 100 palavras
                for (let j = i; j > i - 100 && j >= 0; j--) {
                    if (finalizadores.test(palavras[j].trim())) {
                        melhorQuebra = j;
                        break;
                    }
                }
                
                if (melhorQuebra !== -1 && melhorQuebra > i - 200) {
                    const blocoPronto = palavras.slice(i - palavrasNoBLoco + 1, melhorQuebra + 1).join(' ');
                    blocos.push(blocoPronto);
                    blocoAtual = palavras.slice(melhorQuebra + 1, i + 1).join(' ');
                    palavrasNoBLoco = palavras.slice(melhorQuebra + 1, i + 1).length;
                } else {
                    blocos.push(blocoAtual);
                    blocoAtual = "";
                    palavrasNoBLoco = 0;
                }
            }
        }
        
        if (blocoAtual.trim()) {
            blocos.push(blocoAtual);
        }
        
        return blocos;
    }
    
    async gerarAudioBloco(texto, voz, blocoId) {
        // Tentar com cada chave disponível
        for (let tentativa = 0; tentativa < this.geminiKeys.length; tentativa++) {
            try {
                const chaveIndex = (this.currentKeyIndex + tentativa) % this.geminiKeys.length;
                const chave = this.geminiKeys[chaveIndex];
                
                console.log(`   🔑 Chave ${chaveIndex + 1}/${this.geminiKeys.length}...`);
                
                const audioData = await this.chamarGeminiTTS(texto, voz, chave);
                
                if (audioData) {
                    const audioInfo = this.salvarAudioBase64(audioData, blocoId, chaveIndex);
                    this.currentKeyIndex = (chaveIndex + 1) % this.geminiKeys.length;
                    return audioInfo;
                }
                
            } catch (error) {
                const errorMsg = error.response?.data?.error?.message || error.message;
                console.log(`   ❌ Chave ${tentativa + 1}: ${errorMsg.substring(0, 50)}...`);
                
                if (errorMsg.includes('quota') || errorMsg.includes('limit')) {
                    continue; // Próxima chave
                }
                
                if (error.response?.status === 429) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                }
            }
        }
        
        return null; // Todas as chaves falharam
    }
    
    async chamarGeminiTTS(texto, voz, chave) {
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${chave}`;
        
        const payload = {
            contents: [{ parts: [{ text: texto }] }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voz }
                    }
                }
            },
            model: "gemini-2.5-flash-preview-tts"
        };
        
        const response = await axios.post(API_URL, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 90000
        });
        
        const part = response.data?.candidates?.[0]?.content?.parts?.[0];
        const audioData = part?.inlineData?.data;
        
        if (!audioData) {
            throw new Error('Áudio não encontrado na resposta');
        }
        
        return audioData;
    }
    
    salvarAudioBase64(base64Data, blocoId, chaveIndex) {
        const filename = `${blocoId}_key${chaveIndex + 1}.wav`;
        const audioPath = path.join(this.audioOutputDir, filename);
        
        // Converter base64 para PCM e depois para WAV
        const pcmBuffer = Buffer.from(base64Data, 'base64');
        const wavBuffer = this.pcmParaWav(pcmBuffer, 24000);
        
        fs.writeFileSync(audioPath, wavBuffer);
        const stats = fs.statSync(audioPath);
        
        return {
            filename,
            audioPath,
            audioUrl: `/audio/${filename}`,
            fileSize: stats.size,
            fileSizeKB: Math.round(stats.size / 1024),
            chaveUsada: chaveIndex + 1
        };
    }
    
    pcmParaWav(pcmBuffer, sampleRate) {
        const pcm16 = new Int16Array(pcmBuffer.buffer);
        const dataLength = pcm16.length * 2;
        const buffer = new ArrayBuffer(44 + dataLength);
        const view = new DataView(buffer);
        let offset = 0;
        
        // Cabeçalho WAV
        const writeString = (str) => {
            for (let i = 0; i < str.length; i++) {
                view.setUint8(offset++, str.charCodeAt(i));
            }
        };
        
        writeString('RIFF');
        view.setUint32(offset, 36 + dataLength, true); offset += 4;
        writeString('WAVE');
        writeString('fmt ');
        view.setUint32(offset, 16, true); offset += 4;
        view.setUint16(offset, 1, true); offset += 2; // PCM
        view.setUint16(offset, 1, true); offset += 2; // Mono
        view.setUint32(offset, sampleRate, true); offset += 4;
        view.setUint32(offset, sampleRate * 2, true); offset += 4;
        view.setUint16(offset, 2, true); offset += 2;
        view.setUint16(offset, 16, true); offset += 2;
        writeString('data');
        view.setUint32(offset, dataLength, true); offset += 4;
        
        // Dados PCM
        for (let i = 0; i < pcm16.length; i++) {
            view.setInt16(offset + i * 2, pcm16[i], true);
        }
        
        return Buffer.from(buffer);
    }
    
    async criarSilencio(blocoId) {
        const filename = `${blocoId}_silencio.wav`;
        const audioPath = path.join(this.audioOutputDir, filename);
        
        // Criar 2 segundos de silêncio
        const sampleRate = 24000;
        const duration = 2; // segundos
        const samples = sampleRate * duration;
        const pcm16 = new Int16Array(samples).fill(0);
        
        const wavBuffer = this.pcmParaWav(Buffer.from(pcm16.buffer), sampleRate);
        fs.writeFileSync(audioPath, wavBuffer);
        
        const stats = fs.statSync(audioPath);
        
        return {
            filename,
            audioPath,
            audioUrl: `/audio/${filename}`,
            fileSize: stats.size,
            fileSizeKB: Math.round(stats.size / 1024),
            tipo: 'silencio'
        };
    }
    
    async combinarSegmentos(segmentos, jobId) {
        const { spawn } = require('child_process');
        
        const audioFinalFilename = `${jobId}_completo.wav`;
        const audioFinalPath = path.join(this.audioOutputDir, audioFinalFilename);
        
        // Criar lista de arquivos para FFmpeg
        const listaArquivos = path.join(this.audioOutputDir, `${jobId}_lista.txt`);
        const lista = segmentos.map(seg => `file '${seg.audioPath}'`).join('\n');
        fs.writeFileSync(listaArquivos, lista);
        
        try {
            await new Promise((resolve, reject) => {
                const ffmpeg = spawn('ffmpeg', [
                    '-f', 'concat',
                    '-safe', '0',
                    '-i', listaArquivos,
                    '-c', 'copy',
                    '-y',
                    audioFinalPath
                ]);
                
                ffmpeg.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error(`FFmpeg falhou: ${code}`));
                    }
                });
                
                ffmpeg.on('error', reject);
            });
            
            // Limpar arquivos temporários
            fs.unlinkSync(listaArquivos);
            segmentos.forEach(seg => {
                if (fs.existsSync(seg.audioPath)) {
                    fs.unlinkSync(seg.audioPath);
                }
            });
            
            const stats = fs.statSync(audioFinalPath);
            
            return {
                filename: audioFinalFilename,
                audioPath: audioFinalPath,
                audioUrl: `/audio/${audioFinalFilename}`,
                fileSize: stats.size,
                fileSizeKB: Math.round(stats.size / 1024),
                duration: this.estimarDuracao(stats.size)
            };
            
        } catch (error) {
            if (fs.existsSync(listaArquivos)) {
                fs.unlinkSync(listaArquivos);
            }
            throw error;
        }
    }
    
    estimarDuracao(fileSize) {
        const bytesPerSecond = 24000 * 2;
        const segundos = Math.round(fileSize / bytesPerSecond);
        const minutos = Math.floor(segundos / 60);
        const segsResto = segundos % 60;
        return `${minutos}:${segsResto.toString().padStart(2, '0')}`;
    }
    
    listarVozesDisponiveis() {
        return Object.entries(this.voicesAvailable).map(([nome, descricao]) => ({
            nome,
            descricao,
            recomendada: ['Kore', 'Zephyr', 'Puck', 'Charon', 'Fenrir'].includes(nome)
        }));
    }
    
    async healthCheck() {
        return {
            status: 'healthy',
            service: 'Gemini TTS Premium V6.0',
            configuration: {
                keys: this.geminiKeys.length,
                defaultVoice: this.defaultVoice,
                maxWordsPerBlock: this.maxWordsPerBlock,
                voicesAvailable: Object.keys(this.voicesAvailable).length
            }
        };
    }
}

module.exports = GeminiTTSPremium;
