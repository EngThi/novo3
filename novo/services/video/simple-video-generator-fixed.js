const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class SimpleVideoGenerator {
    constructor(options = {}) {
        this.outputDir = options.outputDir || '/home/user/main/novo3/novo/outputs/videos';
        this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
        
        // Garantir que pasta existe
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
            console.log(`📁 Pasta criada: ${this.outputDir}`);
        }
    }
    
    async generateSimpleVideo(options) {
        const {
            jobId,
            title = 'Vídeo AI Content Studio',
            duration = 15,
            text = 'Vídeo gerado automaticamente',
            color = 'blue'
        } = options;
        
        const outputPath = path.join(this.outputDir, `${jobId}.mp4`);
        
        try {
            // Verificar se pasta existe
            if (!fs.existsSync(this.outputDir)) {
                fs.mkdirSync(this.outputDir, { recursive: true });
                console.log(`📁 Pasta criada: ${this.outputDir}`);
            }
            
            // VERSÃO SIMPLES SEM TEXTO (para evitar problema de fonte)
            const ffmpegCmd = `${this.ffmpegPath} -f lavfi -i "color=c=${color}:size=1280x720:duration=${duration}" -c:v libx264 -preset ultrafast -crf 28 -t ${duration} -y "${outputPath}"`;
            
            console.log(`🎬 Gerando vídeo real: ${jobId} (${duration}s) - cor: ${color}`);
            console.log(`📁 Output: ${outputPath}`);
            
            const { stdout, stderr } = await execAsync(ffmpegCmd);
            
            if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                console.log(`✅ Vídeo criado: ${outputPath} (${Math.round(stats.size / 1024)}KB)`);
                
                return {
                    success: true,
                    videoPath: outputPath,
                    videoUrl: `/videos/${jobId}.mp4`,
                    fileSize: stats.size,
                    fileSizeKB: Math.round(stats.size / 1024),
                    duration: duration,
                    resolution: '1280x720',
                    format: 'mp4',
                    codec: 'h264',
                    title: title,
                    color: color
                };
            } else {
                throw new Error('Arquivo de vídeo não foi criado');
            }
            
        } catch (error) {
            console.error(`❌ Erro ao gerar vídeo: ${error.message}`);
            
            // Fallback: criar vídeo ainda mais simples
            try {
                console.log(`🔄 Tentando comando mais simples...`);
                
                const simplestCmd = `${this.ffmpegPath} -f lavfi -i "testsrc=duration=${duration}:size=1280x720:rate=1" -c:v libx264 -t ${duration} -y "${outputPath}"`;
                
                await execAsync(simplestCmd);
                
                if (fs.existsSync(outputPath)) {
                    const stats = fs.statSync(outputPath);
                    console.log(`✅ Vídeo simples criado: ${outputPath} (${Math.round(stats.size / 1024)}KB)`);
                    
                    return {
                        success: true,
                        videoPath: outputPath,
                        videoUrl: `/videos/${jobId}.mp4`,
                        fileSize: stats.size,
                        fileSizeKB: Math.round(stats.size / 1024),
                        duration: duration,
                        resolution: '1280x720',
                        format: 'mp4',
                        codec: 'h264',
                        title: title,
                        fallback: 'simple_pattern'
                    };
                }
                
            } catch (fallbackError) {
                console.error(`❌ Fallback também falhou: ${fallbackError.message}`);
                throw error;
            }
            
            throw error;
        }
    }
    
    async generateAdvancedVideo(options) {
        const {
            jobId,
            title,
            script,
            thumbnail,
            duration = 20
        } = options;
        
        const colors = ['blue', 'green', 'purple', 'red', 'orange', 'teal', 'navy'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        return this.generateSimpleVideo({
            jobId,
            title,
            text: script?.content?.substring(0, 100) || 'Vídeo gerado com IA',
            duration,
            color: randomColor
        });
    }
    
    async checkFFmpeg() {
        try {
            const { stdout } = await execAsync(`${this.ffmpegPath} -version`);
            return {
                available: true,
                version: stdout.split('\n')[0],
                path: this.ffmpegPath
            };
        } catch (error) {
            return {
                available: false,
                error: error.message,
                path: this.ffmpegPath
            };
        }
    }
}

module.exports = SimpleVideoGenerator;
