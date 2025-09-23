const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const execPromise = util.promisify(exec);

class VideoProcessorFree {
    constructor() {
        this.processors = [
            { name: 'editly', type: 'framework', quality: 'high' },
            { name: 'ffmpeg-direct', type: 'command', quality: 'medium' },
            { name: 'ffcreator', type: 'library', quality: 'high' }
        ];
    }

    async createVideoWithEditly(options) {
        const { images, audio, output, executionId } = options;
        
        try {
            // Verificar se editly está instalado
            const editly = require('editly');
            
            // Calcular duração de cada imagem baseada no áudio
            const audioDuration = await this.getAudioDuration(audio);
            const imageDuration = audioDuration / images.length;
            
            // Configurar editly
            const config = {
                outPath: output,
                width: 1920,
                height: 1080,
                fps: 25,
                audioFilePath: audio,
                clips: images.map((imagePath, index) => ({
                    duration: imageDuration,
                    layers: [
                        {
                            type: 'image',
                            path: imagePath,
                            resizeMode: 'cover'
                        },
                        {
                            type: 'title',
                            text: `Cena ${index + 1}`,
                            fontPath: null, // usar fonte padrão
                            fontSize: 0.05,
                            position: { x: 0.05, y: 0.05 },
                            color: '#FFFFFF'
                        }
                    ]
                }))
            };
            
            console.log('Iniciando renderização com Editly...');
            await editly(config);
            
            return output;
            
        } catch (error) {
            throw new Error(`Editly falhou: ${error.message}`);
        }
    }

    async createVideoWithFFmpeg(options) {
        const { images, audio, output } = options;
        
        try {
            // Verificar se FFmpeg está disponível
            await execPromise('which ffmpeg');
            
            // Calcular duração de cada imagem
            const audioDuration = await this.getAudioDuration(audio);
            const imageDuration = audioDuration / images.length;
            
            // Criar lista de inputs para ffmpeg
            let ffmpegCommand = 'ffmpeg -y ';
            
            // Adicionar cada imagem como input
            images.forEach(imagePath => {
                ffmpegCommand += `-loop 1 -t ${imageDuration} -i "${imagePath}" `;
            });
            
            // Adicionar áudio
            ffmpegCommand += `-i "${audio}" `;
            
            // Filtros de vídeo
            let filterComplex = '';
            images.forEach((_, index) => {
                filterComplex += `[${index}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[v${index}];`;
            });
            
            // Concatenar vídeos
            if (images.length > 1) {
                filterComplex += images.map((_, i) => `[v${i}]`).join('') + `concat=n=${images.length}:v=1:a=0[outv];`;
                ffmpegCommand += `-filter_complex "${filterComplex}" -map "[outv]" -map ${images.length}:a `;
            } else {
                ffmpegCommand += `-filter_complex "${filterComplex}" -map "[v0]" -map 1:a `;
            }
            
            // Configurações de saída
            ffmpegCommand += `-c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "${output}"`;
            
            console.log('Executando comando FFmpeg:', ffmpegCommand);
            const { stdout, stderr } = await execPromise(ffmpegCommand, { timeout: 300000 }); // 5 minutos timeout
            
            if (stderr) {
                console.log('FFmpeg stderr:', stderr);
            }
            
            return output;
            
        } catch (error) {
            throw new Error(`FFmpeg falhou: ${error.message}`);
        }
    }

    async createVideoWithFFCreator(options) {
        const { images, audio, output, executionId } = options;
        
        try {
            // Verificar se FFCreator está instalado
            const { FFCreator, FFScene, FFImage, FFText, FFAudio } = require('ffcreator');
            
            const creator = new FFCreator({
                cacheDir: './cache',
                outputDir: path.dirname(output),
                output: path.basename(output),
                width: 1920,
                height: 1080,
                fps: 25
            });
            
            // Adicionar áudio de fundo
            const bgAudio = new FFAudio({ path: audio, volume: 1, loop: false });
            creator.addAudio(bgAudio);
            
            // Calcular duração de cada imagem
            const audioDuration = await this.getAudioDuration(audio);
            const imageDuration = audioDuration / images.length;
            
            // Criar cenas para cada imagem
            images.forEach((imagePath, index) => {
                const scene = new FFScene();
                scene.setBgColor('#000000');
                scene.setDuration(imageDuration);
                
                // Adicionar imagem
                const img = new FFImage({ path: imagePath, x: 960, y: 540 });
                img.setScale(1.0);
                scene.addChild(img);
                
                // Adicionar texto
                const text = new FFText({ text: `Cena ${index + 1}`, x: 100, y: 100 });
                text.setColor('#ffffff');
                text.setBackgroundColor('#000000');
                scene.addChild(text);
                
                creator.addChild(scene);
            });
            
            // Renderizar
            return new Promise((resolve, reject) => {
                creator.start();
                
                creator.on('complete', () => {
                    console.log('FFCreator renderização completa');
                    resolve(output);
                });
                
                creator.on('error', (error) => {
                    console.error('FFCreator erro:', error);
                    reject(new Error(`FFCreator falhou: ${error.message}`));
                });
            });
            
        } catch (error) {
            throw new Error(`FFCreator falhou: ${error.message}`);
        }
    }

    async getAudioDuration(audioPath) {
        try {
            const { stdout } = await execPromise(
                `ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
            );
            return parseFloat(stdout.trim());
        } catch (error) {
            console.warn('Erro ao obter duração do áudio, usando valor padrão:', error.message);
            return 60; // 60 segundos como padrão
        }
    }

    // Método de emergência: criar vídeo simples
    async createSimpleVideo(options) {
        const { images, audio, output } = options;
        
        try {
            // Usar apenas o primeiro imagem com o áudio
            const firstImage = images[0] || await this.createBlackFrame(output);
            
            const command = `ffmpeg -y -loop 1 -i "${firstImage}" -i "${audio}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "${output}"`;
            
            await execPromise(command, { timeout: 120000 });
            return output;
            
        } catch (error) {
            throw new Error(`Vídeo simples falhou: ${error.message}`);
        }
    }

    async createBlackFrame(outputDir) {
        const blackFramePath = path.join(path.dirname(outputDir), 'black_frame.png');
        
        try {
            const command = `ffmpeg -y -f lavfi -i color=black:size=1920x1080:duration=1 -frames:v 1 "${blackFramePath}"`;
            await execPromise(command);
            return blackFramePath;
        } catch (error) {
            throw new Error(`Criação de frame preto falhou: ${error.message}`);
        }
    }

    // Método principal com fallbacks
    async createVideo(options) {
        const { images, audio, output } = options;
        
        // Validar inputs
        if (!images || images.length === 0) {
            throw new Error('Nenhuma imagem fornecida para o vídeo');
        }
        
        if (!audio || !fs.existsSync(audio)) {
            throw new Error('Arquivo de áudio não encontrado');
        }
        
        // Criar diretório de saída se necessário
        const outputDir = path.dirname(output);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const methods = ['editly', 'ffmpeg-direct', 'simple'];
        const errors = [];
        
        for (const method of methods) {
            try {
                console.log(`Tentando criar vídeo com método: ${method}`);
                
                switch (method) {
                    case 'editly':
                        return await this.createVideoWithEditly(options);
                    case 'ffmpeg-direct':
                        return await this.createVideoWithFFmpeg(options);
                    case 'simple':
                        return await this.createSimpleVideo(options);
                }
                
            } catch (error) {
                errors.push(`${method}: ${error.message}`);
                console.warn(`Método ${method} falhou:`, error.message);
            }
        }
        
        throw new Error(`Todos os métodos de criação de vídeo falharam: ${errors.join('; ')}`);
    }
}

module.exports = VideoProcessorFree;