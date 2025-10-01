require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class PipelineUltimateOptimized {
    constructor() {
        this.geminiKeys = [
            process.env.GEMINI_API_KEY,
            process.env.GEMINI_API_KEY_2,
            process.env.GEMINI_API_KEY_3
        ].filter(key => key && key.length > 20);
        
        this.outputDir = '/home/user/main/novo3/novo/outputs';
        this.imageDir = path.join(this.outputDir, 'images');
        this.audioDir = path.join(this.outputDir, 'audio');
        this.videoDir = path.join(this.outputDir, 'videos');
        
        this.ensureDirectories();
        
        console.log('🚀 Pipeline Ultimate Optimized V6.1');
        console.log(`   🔑 Chaves Gemini: ${this.geminiKeys.length}`);
    }
    
    ensureDirectories() {
        [this.outputDir, this.imageDir, this.audioDir, this.videoDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
    
    async gerarVideoCompleto(topic) {
        const jobId = `optimized-${Date.now()}`;
        
        try {
            console.log(`\n🚀 PIPELINE OPTIMIZED: ${topic}`);
            console.log('=====================================');
            
            // PASSO 1: Script mais conciso
            console.log('🧠 1/5 - Gerando script otimizado...');
            const script = await this.gerarScriptOtimizado(topic);
            console.log(`✅ Script: ${script.title}`);
            console.log(`   📝 Caracteres: ${script.content.length}`);
            
            // PASSO 2: Imagens
            console.log('🎨 2/5 - Gerando imagens...');
            const imagens = await this.gerarImagensRapidas(jobId);
            console.log(`✅ ${imagens.length} imagens prontas`);
            
            // PASSO 3: TTS com timeout otimizado
            console.log('🎙️ 3/5 - TTS Premium optimized...');
            const audioPath = await this.gerarTTSOptimizado(script.content, jobId);
            console.log(`✅ Áudio: ${path.basename(audioPath)}`);
            
            // PASSO 4: Verificar duração do áudio
            const audioDuration = await this.obterDuracaoAudio(audioPath);
            console.log(`   ⏱️ Duração real: ${audioDuration}s`);
            
            // PASSO 5: Vídeo com duração correta
            console.log('🎬 4/5 - Montando vídeo sincronizado...');
            const videoPath = await this.montarVideoSincronizado(imagens, audioPath, jobId, audioDuration);
            console.log(`✅ Vídeo sincronizado: ${path.basename(videoPath)}`);
            
            return {
                success: true,
                jobId,
                script,
                imagens: imagens.length,
                videoPath,
                audioPath,
                audioDuration: `${audioDuration}s`,
                quality: 'HD Optimized'
            };
            
        } catch (error) {
            console.log(`❌ Pipeline falhou: ${error.message}`);
            throw error;
        }
    }
    
    async gerarScriptOtimizado(topic) {
        const currentDate = new Date().toLocaleDateString('pt-BR');
        
        const prompt = `🚀 PIPELINE OPTIMIZED - SCRIPT CONCISO

TÓPICO: "${topic}"
DATA: ${currentDate}

Crie roteiro CONCISO de 2 minutos (máximo 300 palavras) para TTS:

ESTRUTURA RÁPIDA:
1. ABERTURA (15s): Gancho + data
2. CONTEÚDO (90s): 3 pontos principais
3. FECHAMENTO (15s): CTA

IMPORTANTE: 
- Texto NATURAL para narração
- Máximo 300 palavras
- Frases curtas e claras

JSON:
{
  "title": "Título YouTube",
  "content": "Roteiro narrado (máx 300 palavras)",
  "hook": "Abertura impactante",
  "keyPoints": ["ponto1", "ponto2", "ponto3"],
  "duration": "120",
  "wordCount": número_de_palavras
}`;

        for (let i = 0; i < this.geminiKeys.length; i++) {
            try {
                const response = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.geminiKeys[i]}`,
                    {
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 1500
                        }
                    },
                    { timeout: 25000 }
                );
                
                const text = response.data.candidates[0].content.parts[0].text;
                const result = this.parseJSON(text);
                
                // Garantir que não exceda o limite
                if (result.content.length > 1500) {
                    result.content = result.content.substring(0, 1500) + "...";
                }
                
                return result;
                
            } catch (error) {
                console.log(`❌ Chave ${i + 1}: ${error.message.substring(0, 60)}...`);
                continue;
            }
        }
        
        // Fallback ultra conciso
        return {
            title: `${topic} - Análise Rápida ${currentDate}`,
            content: `Olá! Hoje, ${currentDate}, vamos falar sobre ${topic}. Este é um tópico muito importante e atual. Vou apresentar os pontos principais de forma clara e objetiva. Primeiro, vamos entender o contexto atual. Segundo, analisaremos os impactos. Terceiro, veremos as tendências futuras. Obrigado por assistir! Curta e se inscreva no canal!`,
            hook: `Descobra sobre ${topic} hoje`,
            keyPoints: ["Contexto atual", "Impactos principais", "Tendências futuras"],
            duration: "120",
            wordCount: 60
        };
    }
    
    async gerarImagensRapidas(jobId) {
        const prompts = [
            "Professional tech background, modern blue gradient, clean design",
            "AI neural network visualization, futuristic style, high-tech",
            "Modern data center, servers, technology infrastructure",
            "Abstract technology pattern, digital circuits, modern aesthetic"
        ];
        
        const imagens = [];
        
        for (let i = 0; i < prompts.length; i++) {
            try {
                console.log(`🎨 Imagem ${i + 1}/4...`);
                
                // Só tentar Pollinations (mais rápido)
                const imagem = await this.gerarImagemPollinations(prompts[i], jobId, i + 1);
                
                if (imagem) {
                    imagens.push(imagem);
                } else {
                    // Placeholder rápido
                    const placeholder = await this.criarPlaceholderRapido(jobId, i + 1);
                    imagens.push(placeholder);
                }
                
            } catch (error) {
                const placeholder = await this.criarPlaceholderRapido(jobId, i + 1);
                imagens.push(placeholder);
            }
        }
        
        return imagens;
    }
    
    async gerarImagemPollinations(prompt, jobId, sceneIndex) {
        const encodedPrompt = encodeURIComponent(`Professional image: ${prompt}. 16:9, high quality, modern style`);
        const seed = Date.now() + sceneIndex;
        
        const imageUrl = `https://pollinations.ai/p/${encodedPrompt}?width=1280&height=720&seed=${seed}&model=flux`;
        
        try {
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 15000
            });
            
            if (response.data && response.data.byteLength > 5000) {
                const filename = `${jobId}_img${sceneIndex}.png`;
                const imagePath = path.join(this.imageDir, filename);
                
                fs.writeFileSync(imagePath, Buffer.from(response.data));
                
                console.log(`✅ Pollinations: ${filename} (${Math.round(response.data.byteLength / 1024)}KB)`);
                
                return {
                    filename,
                    imagePath,
                    imageUrl: `/images/${filename}`,
                    provider: 'pollinations'
                };
            }
            
        } catch (error) {
            console.log(`❌ Pollinations ${sceneIndex}: timeout`);
        }
        
        return null;
    }
    
    async criarPlaceholderRapido(jobId, sceneIndex) {
        const filename = `${jobId}_placeholder${sceneIndex}.png`;
        const imagePath = path.join(this.imageDir, filename);
        
        await new Promise((resolve) => {
            const ffmpeg = spawn('ffmpeg', [
                '-f', 'lavfi',
                '-i', `color=c=0x2a2a3e:size=1280x720:duration=1`,
                '-vf', `drawtext=text='Tech ${sceneIndex}':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=(h-text_h)/2`,
                '-frames:v', '1',
                '-y',
                imagePath
            ]);
            
            ffmpeg.on('close', () => {
                console.log(`✅ Placeholder: ${filename}`);
                resolve();
            });
            
            // Timeout de 5s para placeholder
            setTimeout(() => {
                ffmpeg.kill();
                resolve();
            }, 5000);
        });
        
        return {
            filename,
            imagePath,
            imageUrl: `/images/${filename}`,
            provider: 'placeholder'
        };
    }
    
    async gerarTTSOptimizado(content, jobId) {
        try {
            console.log('🎙️ TTS Premium com timeout otimizado...');
            
            const GeminiTTS = require('./services/audio/gemini-tts-premium');
            const tts = new GeminiTTS({ logger: console });
            
            // Texto ultra limpo e conciso
            let textoLimpo = content
                .replace(/[{}[\]]/g, '')
                .replace(/"/g, '')
                .replace(/\n/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            
            // Garantir que não exceda 1000 caracteres
            if (textoLimpo.length > 1000) {
                textoLimpo = textoLimpo.substring(0, 1000);
                // Cortar na última frase completa
                const ultimoPonto = textoLimpo.lastIndexOf('.');
                if (ultimoPonto > 500) {
                    textoLimpo = textoLimpo.substring(0, ultimoPonto + 1);
                }
            }
            
            console.log(`   📝 Texto final: ${textoLimpo.length} caracteres`);
            
            const resultado = await tts.gerarNarracaoCompleta(textoLimpo, {
                voz: 'Zephyr',  // Mais rápida que Kore
                jobId: jobId,
                qualidade: 'optimized'
            });
            
            console.log(`✅ TTS: ${resultado.duration} - ${resultado.fileSizeKB}KB`);
            
            return resultado.audioPath;
            
        } catch (error) {
            console.log(`❌ TTS falhou: ${error.message}`);
            console.log('🔄 Usando espeak...');
            
            return this.gerarEspeakRapido(content, jobId);
        }
    }
    
    async gerarEspeakRapido(content, jobId) {
        const audioFilename = `${jobId}_espeak.wav`;
        const audioPath = path.join(this.audioDir, audioFilename);
        
        const textoLimpo = content
            .replace(/[{}[\]]/g, '')
            .replace(/"/g, '')
            .replace(/\n/g, ' ')
            .substring(0, 800);
        
        await new Promise((resolve) => {
            const espeak = spawn('espeak', [
                '-v', 'pt',
                '-s', '180',
                '-p', '60',
                '-w', audioPath,
                textoLimpo
            ]);
            
            espeak.on('close', () => {
                console.log(`✅ Espeak: ${audioFilename}`);
                resolve();
            });
            
            // Timeout 10s
            setTimeout(() => {
                espeak.kill();
                resolve();
            }, 10000);
        });
        
        return audioPath;
    }
    
    async obterDuracaoAudio(audioPath) {
        return new Promise((resolve) => {
            const ffprobe = spawn('ffprobe', [
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                audioPath
            ]);
            
            let output = '';
            
            ffprobe.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            ffprobe.on('close', () => {
                try {
                    const info = JSON.parse(output);
                    const duration = parseFloat(info.format.duration) || 10;
                    resolve(Math.max(duration, 10)); // Mínimo 10s
                } catch (e) {
                    resolve(15); // Fallback 15s
                }
            });
            
            setTimeout(() => {
                ffprobe.kill();
                resolve(12);
            }, 5000);
        });
    }
    
    async montarVideoSincronizado(imagens, audioPath, jobId, audioDuration) {
        const videoFilename = `${jobId}_synced.mp4`;
        const videoPath = path.join(this.videoDir, videoFilename);
        
        // Calcular duração por imagem
        const duracaoPorImagem = audioDuration / imagens.length;
        
        console.log(`🎬 Sincronizando: ${imagens.length} imagens x ${duracaoPorImagem.toFixed(1)}s cada`);
        
        // Criar vídeo com imagens sincronizadas
        const imageListPath = path.join(this.outputDir, `${jobId}_sync.txt`);
        const lista = imagens.map(img => 
            `file '${img.imagePath}'\nduration ${duracaoPorImagem.toFixed(2)}`
        ).join('\n') + `\nfile '${imagens[imagens.length - 1].imagePath}'`;
        
        fs.writeFileSync(imageListPath, lista);
        
        await new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-f', 'concat',
                '-safe', '0',
                '-i', imageListPath,
                '-i', audioPath,
                '-c:v', 'libx264',
                '-c:a', 'aac',
                '-b:a', '128k',
                '-pix_fmt', 'yuv420p',
                '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
                '-shortest',
                '-y',
                videoPath
            ]);
            
            ffmpeg.stderr.on('data', (data) => {
                const output = data.toString();
                if (output.includes('time=')) {
                    const timeMatch = output.match(/time=(\d{2}:\d{2}:\d{2})/);
                    if (timeMatch) {
                        process.stdout.write(`\r🎬 ${timeMatch[1]}`);
                    }
                }
            });
            
            ffmpeg.on('close', (code) => {
                console.log(`\n`);
                if (code === 0) {
                    fs.unlinkSync(imageListPath);
                    
                    const stats = fs.statSync(videoPath);
                    console.log(`✅ Vídeo: ${Math.round(stats.size / (1024 * 1024))}MB`);
                    
                    resolve();
                } else {
                    reject(new Error(`FFmpeg: ${code}`));
                }
            });
        });
        
        return videoPath;
    }
    
    parseJSON(content) {
        try {
            return JSON.parse(content);
        } catch (e) {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    return JSON.parse(jsonMatch[0]);
                } catch (e2) {
                    return this.createFallback();
                }
            }
            return this.createFallback();
        }
    }
    
    createFallback() {
        const currentDate = new Date().toLocaleDateString('pt-BR');
        
        return {
            title: `Tech Update ${currentDate}`,
            content: `Olá! Hoje, ${currentDate}, vamos falar sobre tecnologia. Este vídeo traz as principais novidades do setor tech. Primeiro, vamos ver as tendências atuais. Segundo, analisamos os impactos no mercado. Terceiro, discutimos o futuro da inovação. Essas são informações importantes para quem acompanha tecnologia. Obrigado por assistir! Curta o vídeo e se inscreva no canal para mais conteúdo sobre tecnologia!`,
            hook: `Principais novidades tech de ${currentDate}`,
            keyPoints: ["Tendências atuais", "Impactos no mercado", "Futuro da inovação"],
            duration: "120",
            wordCount: 80
        };
    }
}

async function main() {
    if (process.argv.length < 3) {
        console.log('📋 Uso: node pipeline-ultimate-optimized.js "tópico"');
        process.exit(1);
    }
    
    const topic = process.argv.slice(2).join(' ');
    const pipeline = new PipelineUltimateOptimized();
    
    try {
        const resultado = await pipeline.gerarVideoCompleto(topic);
        
        console.log('\n🎊 PIPELINE OPTIMIZED FINALIZADO!');
        console.log('==================================');
        console.log(`📹 Vídeo: ${resultado.videoPath}`);
        console.log(`🎙️ Áudio: ${resultado.audioPath}`);
        console.log(`⏱️ Duração: ${resultado.audioDuration}`);
        console.log(`🎨 Imagens: ${resultado.imagens}`);
        console.log(`📊 Qualidade: ${resultado.quality}`);
        
    } catch (error) {
        console.log(`\n💥 ERRO: ${error.message}`);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = PipelineUltimateOptimized;
