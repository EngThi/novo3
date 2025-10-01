const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class VisualEffectsGenerator {
    constructor(options = {}) {
        this.outputDir = options.outputDir || '/home/user/main/novo3/novo/outputs/videos';
        this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
        
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }
    
    async generateVideo(options) {
        const {
            jobId,
            title = 'AI Content Studio',
            duration = 15,
            effect = 'fade',
            color = 'blue'
        } = options;
        
        const outputPath = path.join(this.outputDir, `${jobId}.mp4`);
        
        try {
            let cmd = '';
            
            switch (effect) {
                case 'fade':
                    // Fade in/out - FUNCIONA
                    cmd = `${this.ffmpegPath} -f lavfi -i "color=c=${color}:size=1280x720:duration=${duration}" -vf "fade=in:0:30,fade=out:${Math.max(duration*25-30, 30)}:30" -c:v libx264 -preset fast -crf 23 -t ${duration} -y "${outputPath}"`;
                    break;
                    
                case 'pulse':
                    // Efeito pulsante com mudança de brilho
                    cmd = `${this.ffmpegPath} -f lavfi -i "color=c=${color}:size=1280x720:duration=${duration}" -vf "geq=lum='lum(X,Y)*0.5+0.5*sin(2*PI*t)'" -c:v libx264 -preset fast -crf 23 -t ${duration} -y "${outputPath}"`;
                    break;
                    
                case 'rainbow':
                    // Efeito arco-íris
                    cmd = `${this.ffmpegPath} -f lavfi -i "color=c=${color}:size=1280x720:duration=${duration}" -vf "hue=h=t*360*2:s=1" -c:v libx264 -preset fast -crf 23 -t ${duration} -y "${outputPath}"`;
                    break;
                    
                case 'stripes':
                    // Listras verticais animadas
                    cmd = `${this.ffmpegPath} -f lavfi -i "color=c=${color}:size=1280x720:duration=${duration}" -vf "geq=r='255*((X+t*50)%80<40)':g='255*((X+t*50)%80<40)':b='255*((X+t*50)%80<40)'" -c:v libx264 -preset fast -crf 23 -t ${duration} -y "${outputPath}"`;
                    break;
                    
                case 'checkerboard':
                    // Tabuleiro de xadrez animado
                    cmd = `${this.ffmpegPath} -f lavfi -i "testsrc2=size=1280x720:duration=${duration}:rate=25" -vf "colorkey=0x00ff00:0.3:0.2" -c:v libx264 -preset fast -crf 23 -t ${duration} -y "${outputPath}"`;
                    break;
                    
                default:
                    // Simples com cor
                    cmd = `${this.ffmpegPath} -f lavfi -i "color=c=${color}:size=1280x720:duration=${duration}" -c:v libx264 -preset fast -crf 23 -t ${duration} -y "${outputPath}"`;
            }
            
            console.log(`🎬 Gerando vídeo com efeito '${effect}': ${jobId}`);
            
            await execAsync(cmd);
            
            if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                
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
                    effect: effect,
                    color: color
                };
            }
            
        } catch (error) {
            console.error(`❌ Erro com efeito ${effect}:`, error.message);
            
            // Fallback para vídeo simples
            return this.generateSimple(jobId, title, duration, color, outputPath);
        }
    }
    
    async generateSimple(jobId, title, duration, color, outputPath) {
        try {
            const cmd = `${this.ffmpegPath} -f lavfi -i "color=c=${color}:size=1280x720:duration=${duration}" -c:v libx264 -preset ultrafast -crf 28 -t ${duration} -y "${outputPath}"`;
            
            await execAsync(cmd);
            
            const stats = fs.statSync(outputPath);
            
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
                effect: 'simple',
                color: color
            };
            
        } catch (error) {
            throw new Error(`Falha total na geração: ${error.message}`);
        }
    }
    
    async generateAdvanced(options) {
        const {
            jobId,
            title,
            script,
            strategy = 'gcp-free',
            duration = 15
        } = options;
        
        const effects = ['fade', 'pulse', 'rainbow', 'stripes', 'checkerboard'];
        const colors = ['blue', 'green', 'purple', 'red', 'orange', 'teal', 'navy'];
        
        const effect = strategy === 'quality' ? 'rainbow' : 
                      strategy === 'speed' ? 'fade' : 
                      effects[Math.floor(Math.random() * effects.length)];
        
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        return this.generateVideo({
            jobId,
            title: title || 'AI Content Studio',
            duration,
            effect,
            color
        });
    }
}

module.exports = VisualEffectsGenerator;
