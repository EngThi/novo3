require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class PipelineUltimateTTS {
    constructor() {
        // CHAVES REAIS DO .ENV
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
        
        console.log('�� Pipeline Ultimate com TTS Premium V6.0');
        console.log(`   🔑 Chaves Gemini: ${this.geminiKeys.length}`);
        console.log(`   📁 Outputs: ${this.outputDir}`);
    }
    
    ensureDirectories() {
        [this.outputDir, this.imageDir, this.audioDir, this.videoDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
    
    async gerarVideoCompleto(topic) {
        const jobId = `ultimate-tts-${Date.now()}`;
        
        try {
            console.log(`\n🚀 PIPELINE ULTIMATE COM TTS PREMIUM: ${topic}`);
            console.log('=====================================================');
            
            // PASSO 1: Gerar Script
            console.log('🧠 1/5 - Gerando script com Gemini 2.5 Flash...');
            const script = await this.gerarScript(topic);
            console.log(`✅ Script gerado! Título: ${script.title}`);
            
            // PASSO 2: Gerar Prompts Visuais
            console.log('🎨 2/5 - Gerando prompts visuais...');
            const prompts = await this.gerarPromptsVisuais(script);
            console.log(`✅ ${prompts.length} prompts visuais gerados`);
            
            // PASSO 3: Gerar Imagens
            console.log('🖼️ 3/5 - Gerando imagens com multi-provider...');
            const imagens = await this.gerarImagens(prompts, jobId);
            console.log(`✅ ${imagens.length} imagens geradas`);
            
            // PASSO 4: Gerar Narração PREMIUM
            console.log('🎙️ 4/5 - Gerando narração com Gemini TTS Premium...');
            const audioPath = await this.gerarNarracaoPremium(script.content, jobId);
            console.log(`✅ Narração premium gerada: ${path.basename(audioPath)}`);
            
            // PASSO 5: Montar Vídeo Final
            console.log('🎬 5/5 - Montando vídeo final HD...');
            const videoPath = await this.montarVideoFinal(script, imagens, audioPath, jobId);
            console.log(`✅ Vídeo completo: ${path.basename(videoPath)}`);
            
            return {
                success: true,
                jobId,
                script,
                imagens: imagens.length,
                videoPath,
                videoUrl: `/videos/${path.basename(videoPath)}`,
                audioPath,
                audioUrl: `/audio/${path.basename(audioPath)}`,
                duration: '180s',
                quality: 'HD 1280x720 + TTS Premium'
            };
            
        } catch (error) {
            console.log(`❌ Pipeline falhou: ${error.message}`);
            throw error;
        }
    }
    
    async gerarScript(topic) {
        const currentDate = new Date().toLocaleDateString('pt-BR');
        
        const prompt = `🚀 PIPELINE ULTIMATE TTS V6.0 - GEMINI 2.5 FLASH

TÓPICO: "${topic}"
DATA: ${currentDate}

IMPORTANTE: Mencione a data no início do roteiro.

Crie roteiro completo para vídeo de 3 minutos com NARRAÇÃO FLUIDA:

ESTRUTURA:
1. ABERTURA (0-20s): Gancho + data + apresentação
2. DESENVOLVIMENTO (20s-2min20s): 4-5 pontos principais detalhados
3. CONCLUSÃO (2min20s-3min): Resumo + CTA forte

IMPORTANTE: Texto deve ser NATURAL para narração em voz.

Responda APENAS JSON válido:
{
  "title": "Título otimizado para YouTube",
  "content": "Roteiro narrado completo e fluido (como se fosse falado)",
  "hook": "Frase de abertura impactante",
  "keyPoints": ["ponto1", "ponto2", "ponto3", "ponto4"],
  "duration": "180",
  "seoKeywords": ["palavra1", "palavra2", "atual"],
  "callToAction": "CTA específico e motivador"
}`;

        for (let i = 0; i < this.geminiKeys.length; i++) {
            try {
                const response = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.geminiKeys[i]}`,
                    {
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.8,
                            maxOutputTokens: 3000
                        }
                    },
                    { timeout: 30000 }
                );
                
                const text = response.data.candidates[0].content.parts[0].text;
                return this.parseJSON(text);
                
            } catch (error) {
                console.log(`❌ Chave ${i + 1}: ${error.response?.data?.error?.message || error.message}`);
                continue;
            }
        }
        
        throw new Error('Todas as chaves Gemini falharam para script');
    }
    
    async gerarPromptsVisuais(script) {
        const prompts = [
            `Professional tech news studio background, modern design, blue lighting, 16:9 aspect ratio, high quality`,
            `Abstract technology illustration, AI neural networks, futuristic design, blue and purple gradient colors`,
            `Modern data visualization, holographic charts and graphs, professional business style, tech aesthetic`,
            `Futuristic technology concept, digital transformation, glowing interfaces, modern sleek design`,
            `Professional business meeting, modern glass office, technology discussion, corporate environment`,
            `Global technology trends, world map with digital connections, modern infographic style, data streams`
        ];
        
        return prompts.map((prompt, index) => ({
            scene: index + 1,
            description: `Cena ${index + 1} - Visual profissional`,
            prompt: prompt
        }));
    }
    
    async gerarImagens(prompts, jobId) {
        const imagens = [];
        
        for (let i = 0; i < Math.min(prompts.length, 6); i++) {
            try {
                console.log(`🎨 Gerando imagem ${i + 1}/${prompts.length}...`);
                
                // Tentar Nano Banana primeiro
                let imagem = await this.gerarImagemNanoBanana(prompts[i].prompt, jobId, i + 1);
                
                if (!imagem) {
                    // Fallback para Pollinations
                    imagem = await this.gerarImagemPollinations(prompts[i].prompt, jobId, i + 1);
                }
                
                if (!imagem) {
                    // Placeholder se tudo falhar
                    imagem = await this.criarPlaceholder(jobId, i + 1);
                }
                
                imagens.push(imagem);
                
            } catch (error) {
                console.log(`❌ Erro imagem ${i + 1}: ${error.message}`);
                const placeholderPath = await this.criarPlaceholder(jobId, i + 1);
                imagens.push({
                    filename: path.basename(placeholderPath),
                    imagePath: placeholderPath,
                    imageUrl: `/images/${path.basename(placeholderPath)}`,
                    provider: 'placeholder'
                });
            }
        }
        
        return imagens;
    }
    
    async gerarImagemNanoBanana(prompt, jobId, sceneIndex) {
        const imagePrompt = `Generate high-quality professional image: ${prompt}. Resolution: 1280x720, 16:9 aspect ratio, photorealistic, detailed, modern aesthetic`;
        
        for (const apiKey of this.geminiKeys) {
            try {
                const response = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`,
                    {
                        contents: [{ parts: [{ text: imagePrompt }] }],
                        generationConfig: {
                            temperature: 0.7,
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
                    
                    console.log(`✅ Nano Banana: ${filename} (${Math.round(buffer.length / 1024)}KB)`);
                    
                    return {
                        filename,
                        imagePath,
                        imageUrl: `/images/${filename}`,
                        provider: 'nano-banana'
                    };
                }
                
            } catch (error) {
                if (error.response?.data?.error?.message?.includes('quota')) {
                    console.log(`🔄 Nano Banana quota excedida, tentando Pollinations...`);
                    return null;
                }
                continue;
            }
        }
        
        return null;
    }
    
    async gerarImagemPollinations(prompt, jobId, sceneIndex) {
        const enhancedPrompt = `Professional high quality image: ${prompt}. 16:9 aspect ratio, detailed photography, 8k resolution, modern style`;
        const encodedPrompt = encodeURIComponent(enhancedPrompt);
        const seed = Date.now() + sceneIndex;
        
        const imageUrl = `https://pollinations.ai/p/${encodedPrompt}?width=1280&height=720&seed=${seed}&model=flux`;
        
        try {
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 20000
            });
            
            if (response.data && response.data.byteLength > 5000) {
                const filename = `${jobId}_scene${sceneIndex.toString().padStart(2, '0')}_poll.png`;
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
            console.log(`❌ Pollinations erro: ${error.message}`);
        }
        
        return null;
    }
    
    async criarPlaceholder(jobId, sceneIndex) {
        const filename = `${jobId}_scene${sceneIndex.toString().padStart(2, '0')}_placeholder.png`;
        const imagePath = path.join(this.imageDir, filename);
        
        await new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-f', 'lavfi',
                '-i', `color=c=0x1a1a2e:size=1280x720:duration=1`,
                '-vf', `drawtext=text='Tech Scene ${sceneIndex}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2`,
                '-frames:v', '1',
                '-y',
                imagePath
            ]);
            
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    console.log(`✅ Placeholder: ${filename}`);
                    resolve();
                } else {
                    reject(new Error(`FFmpeg placeholder falhou: ${code}`));
                }
            });
        });
        
        return imagePath;
    }
    
    async gerarNarracaoPremium(content, jobId) {
        try {
            console.log('🎙️ Inicializando Gemini TTS Premium...');
            
            const GeminiTTS = require('./services/audio/gemini-tts-premium');
            const tts = new GeminiTTS({ logger: console });
            
            // Limpar e preparar texto para narração
            const textoLimpo = content
                .replace(/[{}[\]]/g, '')
                .replace(/"/g, '')
                .replace(/\n/g, ' ')
                .replace(/\s+/g, ' ')
                .replace(/\. /g, '. ')  // Pausas após pontos
                .replace(/\? /g, '? ')  // Pausas após perguntas
                .replace(/! /g, '! ')   // Pausas após exclamações
                .trim();
            
            const resultado = await tts.gerarNarracaoCompleta(textoLimpo, {
                voz: 'Kore',  // Voz firme ideal para notícias
                jobId: jobId,
                qualidade: 'premium'
            });
            
            console.log(`✅ TTS Premium: ${resultado.filename}`);
            console.log(`   📊 Qualidade: ${resultado.qualidade}`);
            console.log(`   ⏱️ Duração: ${resultado.duration}`);
            console.log(`   📦 Blocos: ${resultado.blocos}`);
            console.log(`   💾 Tamanho: ${resultado.fileSizeKB}KB`);
            
            return resultado.audioPath;
            
        } catch (error) {
            console.log(`❌ TTS Premium falhou: ${error.message}`);
            console.log('🔄 Usando fallback espeak...');
            
            // Fallback para espeak
            return this.gerarNarracaoFallback(content, jobId);
        }
    }
    
    async gerarNarracaoFallback(content, jobId) {
        const audioFilename = `${jobId}_narration_fallback.wav`;
        const audioPath = path.join(this.audioDir, audioFilename);
        
        const textoLimpo = content
            .replace(/[{}[\]]/g, '')
            .replace(/"/g, '')
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ')
            .substring(0, 2000);
        
        await new Promise((resolve, reject) => {
            const espeak = spawn('espeak', [
                '-v', 'pt',
                '-s', '160',  // Velocidade
                '-p', '50',   // Pitch
                '-w', audioPath,
                textoLimpo
            ]);
            
            espeak.on('close', (code) => {
                if (code === 0) {
                    console.log(`✅ Espeak fallback: ${audioFilename}`);
                    resolve();
                } else {
                    reject(new Error(`espeak falhou: ${code}`));
                }
            });
        });
        
        return audioPath;
    }
    
    async montarVideoFinal(script, imagens, audioPath, jobId) {
        const videoFilename = `${jobId}_ultimate_tts.mp4`;
        const videoPath = path.join(this.videoDir, videoFilename);
        
        // Criar lista de imagens para FFmpeg
        const imageListPath = path.join(this.outputDir, `${jobId}_images.txt`);
        const imageList = imagens.map(img => `file '${img.imagePath}'`).join('\n');
        fs.writeFileSync(imageListPath, imageList);
        
        console.log(`🎬 Montando vídeo HD com ${imagens.length} imagens + narração premium...`);
        
        await new Promise((resolve, reject) => {
            const ffmpegArgs = [
                // Input de imagens (slideshow)
                '-f', 'concat',
                '-safe', '0',
                '-i', imageListPath,
                
                // Input de áudio
                '-i', audioPath,
                
                // Configurações de vídeo HD
                '-c:v', 'libx264',
                '-r', '25',
                '-pix_fmt', 'yuv420p',
                '-preset', 'medium',
                
                // Configurações de áudio premium
                '-c:a', 'aac',
                '-b:a', '192k',
                '-ar', '44100',
                
                // Filtros de vídeo aprimorados
                '-vf', `scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,fps=25,fade=in:0:25,fade=out:st=${Math.max(0, (imagens.length * 25) - 25)}:d=25`,
                
                // Duração baseada no áudio
                '-shortest',
                
                // Qualidade
                '-crf', '23',
                
                '-y',
                videoPath
            ];
            
            const ffmpeg = spawn('ffmpeg', ffmpegArgs);
            
            let lastTime = '';
            
            ffmpeg.stderr.on('data', (data) => {
                const output = data.toString();
                if (output.includes('time=')) {
                    const timeMatch = output.match(/time=(\d{2}:\d{2}:\d{2})/);
                    if (timeMatch && timeMatch[1] !== lastTime) {
                        lastTime = timeMatch[1];
                        process.stdout.write(`\r🎬 Processando: ${lastTime}`);
                    }
                }
            });
            
            ffmpeg.on('close', (code) => {
                console.log(`\n`);
                if (code === 0) {
                    console.log(`✅ Vídeo Ultimate TTS: ${videoFilename}`);
                    
                    // Limpar arquivo temporário
                    fs.unlinkSync(imageListPath);
                    
                    // Mostrar informações do vídeo
                    const stats = fs.statSync(videoPath);
                    console.log(`   💾 Tamanho: ${Math.round(stats.size / (1024 * 1024))}MB`);
                    console.log(`   🎨 Qualidade: HD 1280x720`);
                    console.log(`   🎙️ Áudio: Premium TTS + AAC 192k`);
                    
                    resolve();
                } else {
                    reject(new Error(`FFmpeg falhou: ${code}`));
                }
            });
            
            ffmpeg.on('error', reject);
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
            title: `Análise Tech Completa - ${currentDate}`,
            content: `Bem-vindos ao nosso canal de tecnologia! Hoje, ${currentDate}, vamos analisar as principais tendências tecnológicas que estão moldando nosso futuro. Neste vídeo, você vai descobrir insights exclusivos sobre inteligência artificial, inovações digitais e as mudanças que estão transformando o mundo da tecnologia. Fiquem conosco até o final para descobrir as previsões mais interessantes para os próximos meses. Não se esqueçam de curtir este vídeo e se inscrever no nosso canal para receber todas as análises tecnológicas em primeira mão!`,
            hook: `Descubra as principais tendências tecnológicas de ${currentDate}`,
            keyPoints: [
                "Tendências de IA e machine learning", 
                "Inovações em tecnologia móvel", 
                "Transformação digital empresarial", 
                "Futuro da computação em nuvem"
            ],
            duration: "180",
            seoKeywords: ["tecnologia", currentDate.replace(/\//g, ''), "tendencias", "inovacao"],
            callToAction: "Curta, se inscreva e ative as notificações para mais conteúdo tech!"
        };
    }
}

// EXECUTAR PIPELINE ULTIMATE TTS
async function main() {
    if (process.argv.length < 3) {
        console.log('📋 Uso: node pipeline-ultimate-tts.js "seu tópico aqui"');
        process.exit(1);
    }
    
    const topic = process.argv.slice(2).join(' ');
    const pipeline = new PipelineUltimateTTS();
    
    try {
        const resultado = await pipeline.gerarVideoCompleto(topic);
        
        console.log('\n🎊 PIPELINE ULTIMATE TTS FINALIZADO!');
        console.log('========================================');
        console.log(`📹 Vídeo: ${resultado.videoPath}`);
        console.log(`🌐 Vídeo URL: ${resultado.videoUrl}`);
        console.log(`🎙️ Áudio: ${resultado.audioPath}`);
        console.log(`🌐 Áudio URL: ${resultado.audioUrl}`);
        console.log(`🎨 Imagens: ${resultado.imagens}`);
        console.log(`⏱️ Duração: ${resultado.duration}`);
        console.log(`📊 Qualidade: ${resultado.quality}`);
        
    } catch (error) {
        console.log(`\n💥 ERRO: ${error.message}`);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = PipelineUltimateTTS;
