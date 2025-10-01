const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class SimpleVideoGenerator {
    constructor(options = {}) {
        this.outputDir = options.outputDir || '/home/user/main/novo3/novo/outputs/videos';
        this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
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
            // Escapar texto para FFmpeg
            const safeTitle = title.replace(/['"]/g, '').substring(0, 50);
            const safeText = text.replace(/['"]/g, '').substring(0, 100);
            
            // Comando FFmpeg para gerar vídeo com texto
            const ffmpegCmd = `${this.ffmpegPath} -f lavfi -i "color=c=${color}:size=1280x720:duration=${duration}" -vf "drawtext=text='${safeTitle}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2-50,drawtext=text='AI Content Studio':fontcolor=yellow:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2+30" -c:v libx264 -preset fast -crf 23 -t ${duration} -y "${outputPath}"`;
            
            console.log(`🎬 Gerando vídeo real: ${jobId} (${duration}s)`);
            
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
                    title: safeTitle
                };
            } else {
                throw new Error('Arquivo de vídeo não foi criado');
            }
            
        } catch (error) {
            console.error(`❌ Erro ao gerar vídeo: ${error.message}`);
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
        
        const colors = ['blue', 'green', 'purple', 'red', 'orange'];
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
