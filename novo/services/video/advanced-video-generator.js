const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class AdvancedVideoGenerator {
    constructor(options = {}) {
        this.outputDir = options.outputDir || '/home/user/main/novo3/novo/outputs/videos';
        this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
        
        // Garantir que pasta existe
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
            console.log(`📁 Pasta criada: ${this.outputDir}`);
        }
    }
    
    async generateVideo(options) {
        const {
            jobId,
            title = 'AI Content Studio',
            duration = 15,
            color = 'blue',
            style = 'simple'
        } = options;
        
        const outputPath = path.join(this.outputDir, `${jobId}.mp4`);
        
        try {
            let ffmpegCmd;
            
            switch (style) {
                case 'gradient':
                    ffmpegCmd = await this.generateGradientVideo(jobId, title, duration, color, outputPath);
                    break;
                case 'animated':
                    ffmpegCmd = await this.generateAnimatedVideo(jobId, title, duration, color, outputPath);
                    break;
                case 'professional':
                    ffmpegCmd = await this.generateProfessionalVideo(jobId, title, duration, color, outputPath);
                    break;
                default:
                    ffmpegCmd = await this.generateColorVideo(jobId, title, duration, color, outputPath);
            }
            
            console.log(`🎬 Gerando vídeo ${style}: ${jobId} (${duration}s)`);
            
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
                    style: style,
                    color: color
                };
            } else {
                throw new Error('Arquivo de vídeo não foi criado');
            }
            
        } catch (error) {
            console.error(`❌ Erro ao gerar vídeo: ${error.message}`);
            
            // Fallback: vídeo simples colorido
            return this.generateFallbackVideo(jobId, title, duration, color, outputPath);
        }
    }
    
    async generateColorVideo(jobId, title, duration, color, outputPath) {
        // Vídeo colorido simples (funciona sempre)
        return `${this.ffmpegPath} -f lavfi -i "color=c=${color}:size=1280x720:duration=${duration}" -c:v libx264 -preset fast -crf 23 -t ${duration} -y "${outputPath}"`;
    }
    
    async generateGradientVideo(jobId, title, duration, color, outputPath) {
        // Vídeo com gradiente
        const colors = {
            'blue': 'blue,lightblue',
            'green': 'green,lightgreen', 
            'red': 'red,pink',
            'purple': 'purple,lavender',
            'orange': 'orange,yellow'
        };
        
        const gradientColors = colors[color] || 'blue,lightblue';
        
        return `${this.ffmpegPath} -f lavfi -i "color=c=${color}:size=1280x720:duration=${duration}" -vf "fade=in:0:30,fade=out:$((${duration}*25-30)):30" -c:v libx264 -preset fast -crf 23 -t ${duration} -y "${outputPath}"`;
    }
    
    async generateAnimatedVideo(jobId, title, duration, color, outputPath) {
        // Vídeo com movimento (zoom)
        return `${this.ffmpegPath} -f lavfi -i "color=c=${color}:size=1280x720:duration=${duration}" -vf "zoompan=z='zoom+0.01':d=${duration*25}" -c:v libx264 -preset fast -crf 23 -t ${duration} -y "${outputPath}"`;
    }
    
    async generateProfessionalVideo(jobId, title, duration, color, outputPath) {
        // Vídeo com padrão profissional
        return `${this.ffmpegPath} -f lavfi -i "testsrc2=size=1280x720:duration=${duration}:rate=25" -vf "colorkey=0x00ff00:0.3:0.2,format=yuv420p" -c:v libx264 -preset fast -crf 23 -t ${duration} -y "${outputPath}"`;
    }
    
    async generateFallbackVideo(jobId, title, duration, color, outputPath) {
        try {
            console.log(`🔄 Gerando vídeo fallback...`);
            
            const fallbackCmd = `${this.ffmpegPath} -f lavfi -i "color=c=${color}:size=1280x720:duration=${duration}" -c:v libx264 -preset ultrafast -crf 28 -t ${duration} -y "${outputPath}"`;
            
            await execAsync(fallbackCmd);
            
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
                    style: 'fallback',
                    color: color
                };
            }
        } catch (fallbackError) {
            console.error(`❌ Fallback falhou: ${fallbackError.message}`);
            throw fallbackError;
        }
    }
    
    async generateAdvancedVideo(options) {
        const {
            jobId,
            title,
            script,
            thumbnail,
            duration = 20,
            strategy = 'gcp-free'
        } = options;
        
        const styles = ['simple', 'gradient', 'animated', 'professional'];
        const colors = ['blue', 'green', 'purple', 'red', 'orange', 'teal', 'navy'];
        
        const randomStyle = strategy === 'quality' ? 'professional' : 
                           strategy === 'speed' ? 'simple' : 
                           styles[Math.floor(Math.random() * styles.length)];
        
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        return this.generateVideo({
            jobId,
            title: title || 'Vídeo AI Content Studio',
            duration,
            color: randomColor,
            style: randomStyle
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

module.exports = AdvancedVideoGenerator;
