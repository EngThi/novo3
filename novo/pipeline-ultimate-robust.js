require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class PipelineUltimateRobust {
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
        
        console.log('🚀 Pipeline Ultimate Robust V6.2 - SEM PLACEHOLDERS');
        console.log(`   🔑 Chaves Gemini: ${this.geminiKeys.length}`);
        console.log(`   🎨 Provedores de imagem: 4 (Nano Banana, Pollinations, Together, HuggingFace)`);
        console.log(`   🔄 Sistema de retry: 3 tentativas por provedor`);
    }
    
    ensureDirectories() {
        [this.outputDir, this.imageDir, this.audioDir, this.videoDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
    
    async gerarVideoCompleto(topic) {
        const jobId = `robust-${Date.now()}`;
        
        try {
            console.log(`\n🚀 PIPELINE ROBUST: ${topic}`);
            console.log('======================================');
            
            // PASSO 1: Script otimizado
            console.log('🧠 1/5 - Gerando script otimizado...');
            const script = await this.gerarScriptOtimizado(topic);
            console.log(`✅ Script: ${script.title}`);
            console.log(`   📝 Caracteres: ${script.content.length}`);
            
            // PASSO 2: Gerar imagens COM RETRY ROBUSTO
            console.log('🎨 2/5 - Gerando imagens com sistema robusto (SEM placeholders)...');
            const imagens = await this.gerarImagensRobustas(jobId);
            console.log(`✅ ${imagens.length} imagens REAIS geradas (0 placeholders)`);
            
            // PASSO 3: TTS Premium
            console.log('🎙️ 3/5 - TTS Premium...');
            const audioPath = await this.gerarTTSOptimizado(script.content, jobId);
            console.log(`✅ Áudio: ${path.basename(audioPath)}`);
            
            // PASSO 4: Obter duração real
            const audioDuration = await this.obterDuracaoAudio(audioPath);
            console.log(`   ⏱️ Duração real: ${audioDuration}s`);
            
            // PASSO 5: Vídeo sincronizado
            console.log('🎬 4/5 - Montando vídeo sincronizado...');
            const videoPath = await this.montarVideoSincronizado(imagens, audioPath, jobId, audioDuration);
            console.log(`✅ Vídeo final: ${path.basename(videoPath)}`);
            
            return {
                success: true,
                jobId,
                script,
                imagens: imagens.length,
                videoPath,
                audioPath,
                audioDuration: `${audioDuration}s`,
                quality: 'HD Robust - 100% Real Images'
            };
            
        } catch (error) {
            console.log(`❌ Pipeline falhou: ${error.message}`);
            throw error;
        }
    }
    
    async gerarScriptOtimizado(topic) {
        const currentDate = new Date().toLocaleDateString('pt-BR');
        
        const prompt = `🚀 PIPELINE ROBUST - SCRIPT CONCISO

TÓPICO: "${topic}"
DATA: ${currentDate}

Crie roteiro CONCISO de 2 minutos (máximo 300 palavras) para TTS:

ESTRUTURA:
1. ABERTURA (15s): Gancho + data
2. CONTEÚDO (90s): 3 pontos principais
3. FECHAMENTO (15s): CTA

IMPORTANTE: 
- Texto NATURAL para narração
- Máximo 300 palavras
- Frases curtas e claras

JSON:
{
  "title": "Título YouTube otimizado",
  "content": "Roteiro narrado (máx 300 palavras)",
  "hook": "Abertura impactante",
  "keyPoints": ["ponto1", "ponto2", "ponto3"],
  "duration": "120"
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
                
                if (result.content.length > 1500) {
                    result.content = result.content.substring(0, 1500);
                    const ultimoPonto = result.content.lastIndexOf('.');
                    if (ultimoPonto > 500) {
                        result.content = result.content.substring(0, ultimoPonto + 1);
                    }
                }
                
                return result;
                
            } catch (error) {
                console.log(`❌ Chave ${i + 1}: ${error.message.substring(0, 60)}...`);
                continue;
            }
        }
        
        return this.createFallbackScript(topic);
    }
    
    async gerarImagensRobustas(jobId) {
        const prompts = [
            "Professional tech news studio background, modern design, clean blue gradient, professional lighting, 16:9 aspect ratio",
            "AI neural network visualization, futuristic holographic display, glowing nodes and connections, blue and purple aesthetic, high-tech",
            "Modern data center server room, high-tech infrastructure, LED lighting, professional technology environment, sleek design",
            "Abstract technology pattern, digital circuit board design, modern minimalist style, tech aesthetic, professional quality",
            "Futuristic AI interface, holographic displays, modern workspace, technology innovation, clean professional design",
            "Global technology network, world map with digital connections, data streams, modern infographic style, professional"
        ];
        
        const imagens = [];
        
        console.log(`🎨 Iniciando geração robusta de ${prompts.length} imagens...`);
        console.log('   �� Sistema: 4 provedores x 3 tentativas cada = máximo 12 tentativas por imagem');
        console.log('   ⚠️ ZERO placeholders aceitos - só imagens reais!');
        
        for (let i = 0; i < prompts.length; i++) {
            console.log(`\n🖼️ === IMAGEM ${i + 1}/${prompts.length} ===`);
            
            const imagem = await this.gerarImagemComRetryCompleto(prompts[i], jobId, i + 1);
            
            if (imagem) {
                imagens.push(imagem);
                console.log(`✅ Imagem ${i + 1}: SUCESSO (${imagem.provider})`);
            } else {
                console.log(`💥 Imagem ${i + 1}: FALHOU EM TODOS OS PROVEDORES`);
                throw new Error(`Falha crítica: não foi possível gerar imagem ${i + 1} após todas as tentativas`);
            }
        }
        
        console.log(`\n🎊 TODAS AS ${imagens.length} IMAGENS GERADAS COM SUCESSO!`);
        console.log('   📊 Distribuição por provedor:');
        
        const stats = {};
        imagens.forEach(img => {
            stats[img.provider] = (stats[img.provider] || 0) + 1;
        });
        
        Object.entries(stats).forEach(([provider, count]) => {
            console.log(`   - ${provider}: ${count} imagens`);
        });
        
        return imagens;
    }
    
    async gerarImagemComRetryCompleto(prompt, jobId, sceneIndex) {
        // PROVEDORES EM ORDEM DE PRIORIDADE
        const providers = [
            {
                nome: 'Nano Banana',
                metodo: this.gerarImagemNanaBanana.bind(this),
                maxTentativas: 3,
                timeout: 45000
            },
            {
                nome: 'Pollinations',
                metodo: this.gerarImagemPollinations.bind(this),
                maxTentativas: 3,
                timeout: 20000
            },
            {
                nome: 'Together AI',
                metodo: this.gerarImagemTogetherAI.bind(this),
                maxTentativas: 2,
                timeout: 30000
            },
            {
                nome: 'Hugging Face',
                metodo: this.gerarImagemHuggingFace.bind(this),
                maxTentativas: 2,
                timeout: 60000
            }
        ];
        
        for (const provider of providers) {
            console.log(`🔄 Tentando ${provider.nome}...`);
            
            for (let tentativa = 1; tentativa <= provider.maxTentativas; tentativa++) {
                try {
                    console.log(`   🎯 ${provider.nome} tentativa ${tentativa}/${provider.maxTentativas}`);
                    
                    const startTime = Date.now();
                    const resultado = await provider.metodo(prompt, jobId, sceneIndex);
                    const tempoGasto = Date.now() - startTime;
                    
                    if (resultado) {
                        console.log(`   ✅ ${provider.nome} SUCESSO em ${tempoGasto}ms`);
                        return resultado;
                    }
                    
                } catch (error) {
                    const errorMsg = error.message || 'Erro desconhecido';
                    console.log(`   ❌ ${provider.nome} tentativa ${tentativa}: ${errorMsg.substring(0, 80)}...`);
                    
                    // BACKOFF EXPONENCIAL
                    if (tentativa < provider.maxTentativas) {
                        const backoffTime = 1000 * Math.pow(2, tentativa); // 2s, 4s, 8s...
                        console.log(`   ⏱️ Backoff: ${backoffTime}ms`);
                        await new Promise(resolve => setTimeout(resolve, backoffTime));
                    }
                }
            }
            
            console.log(`   💔 ${provider.nome}: Todas as tentativas falharam`);
        }
        
        console.log(`💥 CRÍTICO: Todos os provedores falharam para imagem ${sceneIndex}`);
        return null;
    }
    
    async gerarImagemNanaBanana(prompt, jobId, sceneIndex) {
        const imagePrompt = `Generate high-quality professional image: ${prompt}. Resolution: 1280x720, 16:9 aspect ratio, photorealistic, detailed, modern aesthetic, professional quality`;
        
        // Tentar com cada chave Gemini
        for (let keyIndex = 0; keyIndex < this.geminiKeys.length; keyIndex++) {
            try {
                const apiKey = this.geminiKeys[keyIndex];
                
                const response = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`,
                    {
                        contents: [{ parts: [{ text: imagePrompt }] }],
                        generationConfig: {
                            temperature: 0.6,
                            maxOutputTokens: 1000,
                            responseModalities: ['Image']
                        }
                    },
                    { timeout: 45000 }
                );
                
                const parts = response.data.candidates[0].content.parts;
                const imagePart = parts.find(part => part.inlineData);
                
                if (imagePart) {
                    const filename = `${jobId}_scene${sceneIndex.toString().padStart(2, '0')}_nano.png`;
                    const imagePath = path.join(this.imageDir, filename);
                    
                    const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
                    fs.writeFileSync(imagePath, buffer);
                    
                    return {
                        filename,
                        imagePath,
                        imageUrl: `/images/${filename}`,
                        provider: 'nano-banana',
                        size: Math.round(buffer.length / 1024) + 'KB'
                    };
                }
                
            } catch (error) {
                const errorMsg = error.response?.data?.error?.message || error.message;
                
                if (errorMsg.includes('quota') || errorMsg.includes('limit')) {
                    console.log(`     🔄 Chave ${keyIndex + 1}: Quota excedida`);
                    continue; // Próxima chave
                }
                
                throw error; // Outros erros são críticos
            }
        }
        
        throw new Error('Nano Banana: Todas as chaves falharam');
    }
    
    async gerarImagemPollinations(prompt, jobId, sceneIndex) {
        const enhancedPrompt = `Professional high quality image: ${prompt}. 16:9 aspect ratio, detailed photography, 8k resolution, modern professional style, cinematic lighting`;
        const encodedPrompt = encodeURIComponent(enhancedPrompt);
        const seed = Date.now() + sceneIndex * 1000 + Math.floor(Math.random() * 1000);
        
        const imageUrl = `https://pollinations.ai/p/${encodedPrompt}?width=1280&height=720&seed=${seed}&model=flux&enhance=true`;
        
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 25000,
            headers: {
                'User-Agent': 'Pipeline-Ultimate-Robust/6.2'
            }
        });
        
        if (response.data && response.data.byteLength > 10000) { // Mínimo 10KB
            const filename = `${jobId}_scene${sceneIndex.toString().padStart(2, '0')}_poll.png`;
            const imagePath = path.join(this.imageDir, filename);
            
            fs.writeFileSync(imagePath, Buffer.from(response.data));
            
            return {
                filename,
                imagePath,
                imageUrl: `/images/${filename}`,
                provider: 'pollinations',
                size: Math.round(response.data.byteLength / 1024) + 'KB'
            };
        }
        
        throw new Error('Pollinations: Imagem muito pequena ou inválida');
    }
    
    async gerarImagemTogetherAI(prompt, jobId, sceneIndex) {
        // Só tentar se tiver chave configurada
        const togetherKey = process.env.TOGETHER_API_KEY;
        if (!togetherKey || togetherKey.length < 10) {
            throw new Error('Together AI: Chave não configurada');
        }
        
        const response = await axios.post(
            'https://api.together.xyz/v1/images/generations',
            {
                model: 'black-forest-labs/FLUX.1-schnell-Free',
                prompt: `Professional high-quality image: ${prompt}. 16:9 aspect ratio, detailed, photorealistic, modern professional style`,
                width: 1280,
                height: 720,
                steps: 4,
                n: 1,
                response_format: 'url'
            },
            {
                headers: {
                    'Authorization': `Bearer ${togetherKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        
        const imageUrl = response.data.data[0].url;
        
        // Baixar a imagem
        const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 15000
        });
        
        if (imageResponse.data && imageResponse.data.byteLength > 10000) {
            const filename = `${jobId}_scene${sceneIndex.toString().padStart(2, '0')}_together.png`;
            const imagePath = path.join(this.imageDir, filename);
            
            fs.writeFileSync(imagePath, Buffer.from(imageResponse.data));
            
            return {
                filename,
                imagePath,
                imageUrl: `/images/${filename}`,
                provider: 'together-ai',
                size: Math.round(imageResponse.data.byteLength / 1024) + 'KB'
            };
        }
        
        throw new Error('Together AI: Imagem inválida');
    }
    
    async gerarImagemHuggingFace(prompt, jobId, sceneIndex) {
        const hfToken = process.env.HF_TOKEN;
        const headers = { 'Content-Type': 'application/json' };
        
        if (hfToken && hfToken.length > 10) {
            headers['Authorization'] = `Bearer ${hfToken}`;
        }
        
        const response = await axios.post(
            'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev',
            {
                inputs: `Professional high quality image: ${prompt}. 16:9 aspect ratio, detailed, photorealistic, modern style`,
                parameters: {
                    width: 1280,
                    height: 720,
                    num_inference_steps: 25,
                    guidance_scale: 7.5
                }
            },
            {
                headers,
                responseType: 'arraybuffer',
                timeout: 60000
            }
        );
        
        if (response.data && response.data.byteLength > 10000) {
            const filename = `${jobId}_scene${sceneIndex.toString().padStart(2, '0')}_hf.png`;
            const imagePath = path.join(this.imageDir, filename);
            
            fs.writeFileSync(imagePath, Buffer.from(response.data));
            
            return {
                filename,
                imagePath,
                imageUrl: `/images/${filename}`,
                provider: 'huggingface',
                size: Math.round(response.data.byteLength / 1024) + 'KB'
            };
        }
        
        throw new Error('Hugging Face: Resposta inválida ou em fila');
    }
    
    async gerarTTSOptimizado(content, jobId) {
        try {
            console.log('🎙️ TTS Premium com timeout otimizado...');
            
            const GeminiTTS = require('./services/audio/gemini-tts-premium');
            const tts = new GeminiTTS({ logger: console });
            
            let textoLimpo = content
                .replace(/[{}[\]]/g, '')
                .replace(/"/g, '')
                .replace(/\n/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            
            if (textoLimpo.length > 1000) {
                textoLimpo = textoLimpo.substring(0, 1000);
                const ultimoPonto = textoLimpo.lastIndexOf('.');
                if (ultimoPonto > 500) {
                    textoLimpo = textoLimpo.substring(0, ultimoPonto + 1);
                }
            }
            
            console.log(`   📝 Texto final: ${textoLimpo.length} caracteres`);
            
            const resultado = await tts.gerarNarracaoCompleta(textoLimpo, {
                voz: 'Zephyr',
                jobId: jobId,
                qualidade: 'premium'
            });
            
            console.log(`✅ TTS: ${resultado.duration} - ${resultado.fileSizeKB}KB`);
            
            return resultado.audioPath;
            
        } catch (error) {
            console.log(`❌ TTS Premium falhou: ${error.message}`);
            console.log('🔄 Usando fallback espeak...');
            
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
                    const duration = parseFloat(info.format.duration) || 15;
                    resolve(Math.max(duration, 10));
                } catch (e) {
                    resolve(20); // Fallback
                }
            });
            
            setTimeout(() => {
                ffprobe.kill();
                resolve(18);
            }, 5000);
        });
    }
    
    async montarVideoSincronizado(imagens, audioPath, jobId, audioDuration) {
        const videoFilename = `${jobId}_robust.mp4`;
        const videoPath = path.join(this.videoDir, videoFilename);
        
        const duracaoPorImagem = audioDuration / imagens.length;
        
        console.log(`🎬 Sincronizando: ${imagens.length} imagens x ${duracaoPorImagem.toFixed(1)}s cada`);
        
        const imageListPath = path.join(this.outputDir, `${jobId}_robust.txt`);
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
                '-b:a', '192k',
                '-pix_fmt', 'yuv420p',
                '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,fps=25',
                '-shortest',
                '-crf', '20',
                '-preset', 'medium',
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
                    console.log(`✅ Vídeo robusto: ${Math.round(stats.size / (1024 * 1024))}MB`);
                    console.log(`   🎨 Qualidade: HD 1280x720, CRF 20`);
                    console.log(`   🎙️ Áudio: AAC 192k premium`);
                    
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
                    return this.createFallbackScript();
                }
            }
            return this.createFallbackScript();
        }
    }
    
    createFallbackScript(topic = 'Tecnologia Atual') {
        const currentDate = new Date().toLocaleDateString('pt-BR');
        
        return {
            title: `${topic} - Análise Completa ${currentDate}`,
            content: `Olá! Hoje, ${currentDate}, vamos explorar ${topic}. Este é um assunto fascinante e muito relevante nos dias atuais. Primeiro, vamos entender o contexto e a importância deste tema. Em seguida, analisaremos os principais aspectos e características. Por último, vamos discutir as tendências e perspectivas futuras. Essas informações são essenciais para quem quer se manter atualizado. Obrigado por assistir! Se gostou do conteúdo, curta o vídeo e se inscreva no canal para mais análises como esta.`,
            hook: `Descobra tudo sobre ${topic} em ${currentDate}`,
            keyPoints: ["Contexto e importância", "Principais aspectos", "Tendências futuras"],
            duration: "120"
        };
    }
}

async function main() {
    if (process.argv.length < 3) {
        console.log('📋 Uso: node pipeline-ultimate-robust.js "seu tópico aqui"');
        console.log('🎯 Sistema Robusto: 0% placeholders, 100% imagens reais');
        process.exit(1);
    }
    
    const topic = process.argv.slice(2).join(' ');
    const pipeline = new PipelineUltimateRobust();
    
    try {
        const resultado = await pipeline.gerarVideoCompleto(topic);
        
        console.log('\n🎊 PIPELINE ROBUST FINALIZADO!');
        console.log('=================================');
        console.log(`📹 Vídeo: ${resultado.videoPath}`);
        console.log(`🎙️ Áudio: ${resultado.audioPath}`);
        console.log(`⏱️ Duração: ${resultado.audioDuration}`);
        console.log(`🎨 Imagens: ${resultado.imagens} (100% reais)`);
        console.log(`📊 Qualidade: ${resultado.quality}`);
        console.log(`\n🏆 ZERO PLACEHOLDERS - APENAS IMAGENS AI REAIS!`);
        
    } catch (error) {
        console.log(`\n💥 ERRO: ${error.message}`);
        console.log('🔧 Verifique conectividade e chaves de API');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = PipelineUltimateRobust;
