const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const execPromise = util.promisify(exec);

class TTSGeneratorFree {
    constructor() {
        this.services = [
            { name: 'mozilla-tts', local: true, quality: 'high' },
            { name: 'espeak', local: true, quality: 'medium', lightweight: true },
            { name: 'gtts', online: true, quality: 'high', free: true },
            { name: 'festival', local: true, quality: 'medium' }
        ];
    }

    async generateWithMozillaTTS(script, outputDir, executionId) {
        const outputPath = path.join(outputDir, `${executionId}_narration_mozilla.wav`);
        
        try {
            // Verificar se TTS está instalado
            await execPromise('which tts');
            
            // Gerar áudio com Mozilla TTS
            const command = `tts --text "${script.replace(/"/g, '\"')}" --out_path "${outputPath}" --model_name "tts_models/pt/cv/vits"`;
            const { stdout, stderr } = await execPromise(command, { timeout: 120000 });
            
            console.log('Mozilla TTS output:', stdout);
            if (stderr) console.warn('Mozilla TTS warnings:', stderr);
            
            // Converter para MP3 se necessário
            const mp3Path = outputPath.replace('.wav', '.mp3');
            await execPromise(`ffmpeg -i "${outputPath}" -acodec mp3 "${mp3Path}"`);
            
            // Remover WAV original
            fs.unlinkSync(outputPath);
            
            return mp3Path;
            
        } catch (error) {
            throw new Error(`Mozilla TTS falhou: ${error.message}`);
        }
    }

    async generateWithEspeak(script, outputDir, executionId) {
        const outputPath = path.join(outputDir, `${executionId}_narration_espeak.wav`);
        
        try {
            // Verificar se espeak está instalado
            await execPromise('which espeak');
            
            // Gerar áudio com eSpeak (português brasileiro)
            const command = `espeak -v pt-br -s 150 -p 50 -a 100 "${script.replace(/"/g, '\"')}" -w "${outputPath}"`;
            await execPromise(command, { timeout: 60000 });
            
            // Converter para MP3
            const mp3Path = outputPath.replace('.wav', '.mp3');
            await execPromise(`ffmpeg -i "${outputPath}" -acodec mp3 -ab 128k "${mp3Path}"`);
            
            // Remover WAV original
            fs.unlinkSync(outputPath);
            
            return mp3Path;
            
        } catch (error) {
            throw new Error(`eSpeak falhou: ${error.message}`);
        }
    }

    async generateWithGTTS(script, outputDir, executionId) {
        const outputPath = path.join(outputDir, `${executionId}_narration_gtts.mp3`);
        
        try {
            // Usar gTTS via Python (mais confiável que API direta)
            const pythonScript = `
import gtts
import sys

text = sys.argv[1]
output_path = sys.argv[2]

tts = gtts.gTTS(text=text, lang='pt', slow=False)
tts.save(output_path)
print(f"Áudio salvo em: {output_path}")
`;
            
            // Salvar script Python temporário
            const tempScript = path.join(outputDir, 'temp_gtts.py');
            fs.writeFileSync(tempScript, pythonScript);
            
            // Executar script Python
            const command = `python3 "${tempScript}" "${script.replace(/"/g, '\"')}" "${outputPath}"`;
            const { stdout } = await execPromise(command, { timeout: 60000 });
            
            console.log('gTTS output:', stdout);
            
            // Remover script temporário
            fs.unlinkSync(tempScript);
            
            return outputPath;
            
        } catch (error) {
            // Fallback: tentar instalar gTTS e executar novamente
            try {
                console.log('Tentando instalar gTTS...');
                await execPromise('pip3 install gtts');
                return await this.generateWithGTTS(script, outputDir, executionId);
            } catch (installError) {
                throw new Error(`gTTS falhou: ${error.message}`);
            }
        }
    }

    async generateWithFestival(script, outputDir, executionId) {
        const outputPath = path.join(outputDir, `${executionId}_narration_festival.wav`);
        
        try {
            // Verificar se festival está instalado
            await execPromise('which festival');
            
            // Criar arquivo de texto temporário
            const textFile = path.join(outputDir, 'temp_script.txt');
            fs.writeFileSync(textFile, script);
            
            // Gerar áudio com Festival
            const command = `festival --tts "${textFile}" --otype wav --output "${outputPath}"`;
            await execPromise(command, { timeout: 60000 });
            
            // Converter para MP3
            const mp3Path = outputPath.replace('.wav', '.mp3');
            await execPromise(`ffmpeg -i "${outputPath}" -acodec mp3 "${mp3Path}"`);
            
            // Limpar arquivos temporários
            fs.unlinkSync(textFile);
            fs.unlinkSync(outputPath);
            
            return mp3Path;
            
        } catch (error) {
            throw new Error(`Festival falhou: ${error.message}`);
        }
    }

    // Método de emergência: síntese de áudio silencioso
    async generateSilentAudio(script, outputDir, executionId) {
        const outputPath = path.join(outputDir, `${executionId}_narration_silent.mp3`);
        
        try {
            // Calcular duração baseada no comprimento do texto (aproximadamente)
            const wordsPerMinute = 150;
            const words = script.split(' ').length;
            const durationSeconds = Math.max(10, (words / wordsPerMinute) * 60);
            
            // Gerar áudio silencioso com FFmpeg
            const command = `ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t ${durationSeconds} -acodec mp3 "${outputPath}"`;
            await execPromise(command);
            
            console.warn(`Áudio silencioso gerado com ${durationSeconds}s de duração`);
            return outputPath;
            
        } catch (error) {
            throw new Error(`Geração de áudio silencioso falhou: ${error.message}`);
        }
    }

    // Método principal com fallbacks
    async generateAudio(script, outputDir, executionId) {
        const errors = [];
        
        // Tentar cada serviço em ordem de preferência
        const serviceOrder = ['mozilla-tts', 'gtts', 'espeak', 'festival'];
        
        for (const serviceName of serviceOrder) {
            try {
                console.log(`Tentando gerar áudio com ${serviceName}...`);
                
                switch (serviceName) {
                    case 'mozilla-tts':
                        return await this.generateWithMozillaTTS(script, outputDir, executionId);
                    case 'espeak':
                        return await this.generateWithEspeak(script, outputDir, executionId);
                    case 'gtts':
                        return await this.generateWithGTTS(script, outputDir, executionId);
                    case 'festival':
                        return await this.generateWithFestival(script, outputDir, executionId);
                }
                
            } catch (error) {
                errors.push(`${serviceName}: ${error.message}`);
                console.warn(`${serviceName} falhou:`, error.message);
            }
        }
        
        // Se todos falharam, gerar áudio silencioso
        console.warn('Todos os serviços de TTS falharam, gerando áudio silencioso');
        console.warn('Erros encontrados:', errors.join('; '));
        
        return await this.generateSilentAudio(script, outputDir, executionId);
    }
}

module.exports = TTSGeneratorFree;