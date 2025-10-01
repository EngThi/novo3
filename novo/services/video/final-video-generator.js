const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class FinalVideoGenerator {
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
            effect = 'rainbow',
            color = 'blue'
        } = options;
        
        const outputPath = path.join(this.outputDir, `${jobId}.mp4`);
        
        try {
            let cmd = '';
            
            switch (effect) {
                case 'rainbow':
                    // EFEITO MAIS VISUAL - Mudança de cores
                    cmd = `${this.ffmpegPath} -f lavfi -i "color=c=${color}:size=1280x720:duration=${duration}" -vf "hue=h=t*360*2:s=1" -c:v libx264 -preset fast -crf 23 -t ${duration} -y "${outputPath}"`;
                    break;
                    
                case 'checkerboard':
                    // PADRÃO COLORIDO COMPLEXO
                    cmd = `${this.ffmpegPath} -f lavfi -i "testsrc2=size=1280x720:duration=${duration}:rate=25" -vf "colorkey=0x00ff00:0.3:0.2" -c:v libx264 -preset fast -crf 23 -t ${duration} -y "${outputPath}"`;
                    break;
                    
                case 'fade':
                    // FADE SUAVE
                    cmd = `${this.ffmpegPath} -f lavfi -i "color=c=${color}:size=1280x720:duration=${duration}" -vf "fade=in:0:30,fade=out:${Math.max(duration*25-30, 30)}:30" -c:v libx264 -preset fast -crf 23 -t ${duration} -y "${outputPath}"`;
                    break;
                    
                case 'gradient':
                    // GRADIENTE ANIMADO
                    cmd = `${this.ffmpegPath} -f lavfi -i "color=c=${color}:size=1280x720:duration=${duration}" -vf "fade=in:0:50,fade=out:${Math.max(duration*25-50, 50)}:50" -c:v libx264 -preset fast -crf 23 -t ${duration} -y "${outputPath}"`;
                    break;
                    
                case 'noise':
                    // RUÍDO COLORIDO
                    cmd = `${this.ffmpegPath} -f lavfi -i "color=c=${color}:size=1280x720:duration=${duration}" -vf "noise=alls=20:allf=t+u" -c:v libx264 -preset fast -crf 23 -t ${duration} -y "${outputPath}"`;
                    break;
                    
                default:
                    // SIMPLES COLORIDO
                    cmd = `${this.ffmpegPath} -f lavfi -i "color=c=${color}:size=1280x720:duration=${duration}" -c:v libx264 -preset fast -crf 23 -t ${duration} -y "${outputPath}"`;
            }
            
            console.log(`🎬 Gerando vídeo '${effect}': ${jobId} (${duration}s)`);
            
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
            
            // Fallback para rainbow (que sempre funciona)
            if (effect !== 'rainbow') {
                return this.generateVideo({
                    ...options,
                    effect: 'rainbow'
                });
            }
            
            throw error;
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
        
        // Efeitos que funcionam 100%
        const workingEffects = ['rainbow', 'checkerboard', 'fade', 'gradient', 'noise'];
        const colors = ['blue', 'green', 'purple', 'red', 'orange', 'teal', 'navy', 'pink'];
        
        let effect;
        
        // Estratégia determina efeito
        switch (strategy) {
            case 'quality':
                effect = 'rainbow'; // Mais visual
                break;
            case 'speed':
                effect = 'fade'; // Mais rápido
                break;
            case 'premium':
                effect = 'checkerboard'; // Mais complexo
                break;
            default:
                effect = workingEffects[Math.floor(Math.random() * workingEffects.length)];
        }
        
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        return this.generateVideo({
            jobId,
            title: title || 'AI Content Studio',
            duration,
            effect,
            color
        });
    }
    
    async checkFFmpeg() {
        try {
            const { stdout } = await execAsync(`${this.ffmpegPath} -version`);
            return {
                available: true,
                version: stdout.split('\n')[0],
                path: this.ffmpegPath,
                supportedEffects: ['rainbow', 'checkerboard', 'fade', 'gradient', 'noise']
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

module.exports = FinalVideoGenerator;
