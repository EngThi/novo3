const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class AdvancedVideoAssembler {
    constructor(options = {}) {
        this.outputDir = options.outputDir || '/home/user/main/novo3/novo/outputs/videos';
        this.imageDir = options.imageDir || '/home/user/main/novo3/novo/outputs/images';
        this.audioDir = options.audioDir || '/home/user/main/novo3/novo/outputs/audio';
        this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    }
    
    async assembleVideoFromImages(options) {
        const {
            jobId,
            images,
            script,
            duration = 30
        } = options;
        
        const outputPath = path.join(this.outputDir, `${jobId}_complete.mp4`);
        
        try {
            // 1. Verificar imagens disponíveis
            const availableImages = images.filter(img => 
                img.success && fs.existsSync(img.imagePath)
            );
            
            if (availableImages.length === 0) {
                throw new Error('Nenhuma imagem disponível para montagem');
            }
            
            console.log(`🎬 Montando vídeo: ${availableImages.length} imagens`);
            
            // 2. Calcular duração por imagem
            const durationPerImage = Math.max(2, Math.floor(duration / availableImages.length));
            
            // 3. Criar arquivo de lista para FFmpeg
            const listFile = path.join(this.outputDir, `${jobId}_list.txt`);
            const listContent = availableImages.map(img => 
                `file '${img.imagePath}'\nduration ${durationPerImage}`
            ).join('\n') + '\n' + `file '${availableImages[availableImages.length - 1].imagePath}'`;
            
            fs.writeFileSync(listFile, listContent);
            
            // 4. Comando FFmpeg para montar vídeo
            const ffmpegCmd = `${this.ffmpegPath} -f concat -safe 0 -i "${listFile}" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1" -c:v libx264 -preset medium -crf 23 -r 25 -t ${duration} -y "${outputPath}"`;
            
            console.log(`🔧 Executando montagem FFmpeg...`);
            
            const { stdout, stderr } = await execAsync(ffmpegCmd);
            
            if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                
                // Limpar arquivo temporário
                fs.unlinkSync(listFile);
                
                console.log(`✅ Vídeo montado: ${outputPath} (${Math.round(stats.size / 1024)}KB)`);
                
                return {
                    success: true,
                    videoPath: outputPath,
                    videoUrl: `/videos/${path.basename(outputPath)}`,
                    fileSize: stats.size,
                    fileSizeKB: Math.round(stats.size / 1024),
                    duration: duration,
                    resolution: '1280x720',
                    format: 'mp4',
                    codec: 'h264',
                    imagesUsed: availableImages.length,
                    durationPerImage: durationPerImage,
                    type: 'assembled_from_images'
                };
                
            } else {
                throw new Error('Vídeo montado não foi criado');
            }
            
        } catch (error) {
            console.error(`❌ Erro na montagem: ${error.message}`);
            
            // Fallback: usar o gerador de efeitos
            const FinalVideoGenerator = require('./final-video-generator');
            const fallbackGenerator = new FinalVideoGenerator();
            
            console.log(`🔄 Usando fallback: gerador de efeitos`);
            
            return fallbackGenerator.generateAdvanced({
                jobId: jobId + '_fallback',
                title: script?.title || 'AI Content Studio',
                duration,
                strategy: 'quality'
            });
        }
    }
}

module.exports = AdvancedVideoAssembler;
