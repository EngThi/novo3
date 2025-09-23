const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const execPromise = util.promisify(exec);
const CredentialManager = require('./credential-manager');

class TTSGeneratorPremium {
    constructor() {
        this.credentialManager = new CredentialManager();
        this.services = [
            {
                name: 'huggingface_parler',
                priority: 1,
                type: 'premium',
                endpoint: 'https://api-inference.huggingface.co/models/parler-tts/parler-tts-mini-v1',
                quality: 'excellent',
                quota_limit: 100,
                languages: ['en', 'pt']
            },
            {
                name: 'huggingface_xtts',
                priority: 2,
                type: 'premium',
                endpoint: 'https://api-inference.huggingface.co/models/coqui/XTTS-v2',
                quality: 'excellent',
                quota_limit: 50,
                languages: ['pt', 'en', 'es', 'fr', 'de', 'it']
            },
            {
                name: 'huggingface_speecht5',
                priority: 3,
                type: 'premium', 
                endpoint: 'https://api-inference.huggingface.co/models/microsoft/speecht5_tts',
                quality: 'high',
                quota_limit: 200,
                languages: ['en']
            },
            {
                name: 'mozilla_tts',
                priority: 4,
                type: 'local',
                quality: 'high',
                unlimited: true,
                languages: ['pt', 'en', 'es', 'fr']
            },
            {
                name: 'gtts',
                priority: 5,
                type: 'free',
                quality: 'good',
                unlimited: true,
                languages: ['pt', 'en', 'es', 'fr', 'de', 'it']
            },
            {
                name: 'espeak',
                priority: 6,
                type: 'local',
                quality: 'medium',
                unlimited: true,
                lightweight: true,
                languages: ['pt', 'en', 'es', 'fr', 'de']
            },
            {
                name: 'festival',
                priority: 7,
                type: 'local',
                quality: 'medium',
                unlimited: true,
                languages: ['en']
            },
            {
                name: 'silent',
                priority: 999,
                type: 'fallback',
                quality: 'none'
            }
        ];
    }

    async generateAudio(script, outputDir, executionId, options = {}) {
        const language = options.language || 'pt';
        const voice = options.voice || 'female';
        const outputPath = path.join(outputDir, `${executionId}_narration.mp3`);
        
        console.log(`🎧 Gerando narração (${language}, ${voice})...`);
        console.log(`   Texto: "${script.substring(0, 100)}..."`);
        
        // Filtrar serviços por idioma suportado
        const compatibleServices = this.services.filter(service => 
            service.type === 'fallback' || 
            !service.languages || 
            service.languages.includes(language)
        ).sort((a, b) => a.priority - b.priority);
        
        let lastError = null;
        
        for (const service of compatibleServices) {
            if (service.type === 'fallback') continue;
            
            try {
                console.log(`   🔄 Tentando ${service.name}...`);
                
                // Obter credencial se necessário
                let credential = null;
                if (service.type === 'premium') {
                    try {
                        credential = await this.credentialManager.getNextCredential('text_to_speech');
                    } catch (credError) {
                        console.warn(`   ⚠️ Sem credenciais para ${service.name}: ${credError.message}`);
                        continue;
                    }
                }
                
                const audioPath = await this.generateWithService(service, script, outputDir, executionId, language, voice, credential);
                
                // Registrar sucesso
                if (credential) {
                    await this.credentialManager.recordUsage(credential, 'text_to_speech', true);
                }
                
                console.log(`   ✅ ${service.name}: ${path.basename(audioPath)} (${service.quality})`);
                return {
                    localPath: audioPath,
                    service: service.name,
                    quality: service.quality,
                    language: language,
                    voice: voice
                };
                
            } catch (error) {
                lastError = error;
                console.warn(`   ❌ ${service.name} falhou: ${error.message}`);
                
                // Registrar falha se havia credencial
                if (service.type === 'premium') {
                    try {
                        const credential = await this.credentialManager.getNextCredential('text_to_speech');
                        await this.credentialManager.recordFailure(credential, 'text_to_speech', error);
                    } catch (credError) {
                        // Ignorar erro de credencial aqui
                    }
                }
                
                continue;
            }
        }
        
        // Se todos falharam, gerar áudio silencioso
        console.warn(`   🔄 Todos os serviços TTS falharam, gerando áudio silencioso...`);
        try {
            const silentPath = await this.generateSilentAudio(script, outputDir, executionId);
            console.log(`   ✅ Áudio silencioso gerado: ${path.basename(silentPath)}`);
            return {
                localPath: silentPath,
                service: 'silent',
                quality: 'none',
                language: language,
                error: lastError?.message
            };
        } catch (silentError) {
            throw new Error(`Falha crítica no TTS: ${lastError?.message || 'Erro desconhecido'}`);
        }
    }

    async generateWithService(service, script, outputDir, executionId, language, voice, credential = null) {
        switch (service.name) {
            case 'huggingface_parler':
                return await this.generateWithHuggingFaceParler(service, script, outputDir, executionId, language, voice, credential);
            case 'huggingface_xtts':
                return await this.generateWithHuggingFaceXTTS(service, script, outputDir, executionId, language, voice, credential);
            case 'huggingface_speecht5':
                return await this.generateWithHuggingFaceSpeechT5(service, script, outputDir, executionId, language, voice, credential);
            case 'mozilla_tts':
                return await this.generateWithMozillaTTS(script, outputDir, executionId, language);
            case 'gtts':
                return await this.generateWithGTTS(script, outputDir, executionId, language);
            case 'espeak':
                return await this.generateWithEspeak(script, outputDir, executionId, language);
            case 'festival':
                return await this.generateWithFestival(script, outputDir, executionId);
            default:
                throw new Error(`Serviço ${service.name} não implementado`);
        }
    }

    async generateWithHuggingFaceParler(service, script, outputDir, executionId, language, voice, credential) {
        if (!credential || !credential.api_key) {
            throw new Error('API key necessária para Hugging Face Parler-TTS');
        }
        
        const outputPath = path.join(outputDir, `${executionId}_narration_parler.wav`);
        
        try {
            // Parler-TTS usa descrição de voz
            const voiceDescription = voice === 'male' ? 
                'A clear male speaker with a moderate pace and pleasant tone.' :
                'A clear female speaker with a moderate pace and warm tone.';
            
            const response = await axios.post(service.endpoint, {
                inputs: {
                    text: script,
                    description: voiceDescription
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${credential.api_key}`,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer',
                timeout: 120000
            });
            
            // Salvar arquivo de áudio
            await fs.writeFileSync(outputPath, response.data);
            
            // Converter para MP3
            const mp3Path = outputPath.replace('.wav', '.mp3');
            await execPromise(`ffmpeg -i "${outputPath}" -acodec mp3 -ab 128k "${mp3Path}"`);
            
            // Remover WAV original
            fs.unlinkSync(outputPath);
            
            return mp3Path;
            
        } catch (error) {
            if (error.response && error.response.status === 503) {
                throw new Error('Modelo Parler-TTS temporariamente indisponível');
            }
            throw new Error(`Parler-TTS falhou: ${error.message}`);
        }
    }

    async generateWithHuggingFaceXTTS(service, script, outputDir, executionId, language, voice, credential) {
        if (!credential || !credential.api_key) {
            throw new Error('API key necessária para Hugging Face XTTS');
        }
        
        const outputPath = path.join(outputDir, `${executionId}_narration_xtts.wav`);
        
        try {
            const response = await axios.post(service.endpoint, {
                inputs: {
                    text: script,
                    language: language,
                    speaker_embedding: voice === 'male' ? 'male_speaker' : 'female_speaker'
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${credential.api_key}`,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer',
                timeout: 120000
            });
            
            await fs.writeFileSync(outputPath, response.data);
            
            // Converter para MP3
            const mp3Path = outputPath.replace('.wav', '.mp3');
            await execPromise(`ffmpeg -i "${outputPath}" -acodec mp3 -ab 128k "${mp3Path}"`);
            
            fs.unlinkSync(outputPath);
            return mp3Path;
            
        } catch (error) {
            if (error.response && error.response.status === 503) {
                throw new Error('Modelo XTTS temporariamente indisponível');
            }
            throw new Error(`XTTS falhou: ${error.message}`);
        }
    }

    async generateWithHuggingFaceSpeechT5(service, script, outputDir, executionId, language, voice, credential) {
        if (!credential || !credential.api_key) {
            throw new Error('API key necessária para Hugging Face SpeechT5');
        }
        
        const outputPath = path.join(outputDir, `${executionId}_narration_speecht5.wav`);
        
        try {
            const response = await axios.post(service.endpoint, {
                inputs: script
            }, {
                headers: {
                    'Authorization': `Bearer ${credential.api_key}`,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer',
                timeout: 120000
            });
            
            await fs.writeFileSync(outputPath, response.data);
            
            // Converter para MP3
            const mp3Path = outputPath.replace('.wav', '.mp3');
            await execPromise(`ffmpeg -i "${outputPath}" -acodec mp3 -ab 128k "${mp3Path}"`);
            
            fs.unlinkSync(outputPath);
            return mp3Path;
            
        } catch (error) {
            if (error.response && error.response.status === 503) {
                throw new Error('Modelo SpeechT5 temporariamente indisponível');
            }
            throw new Error(`SpeechT5 falhou: ${error.message}`);
        }
    }

    async generateWithMozillaTTS(script, outputDir, executionId, language) {
        const outputPath = path.join(outputDir, `${executionId}_narration_mozilla.wav`);
        
        try {
            // Verificar se TTS está instalado
            await execPromise('which tts');
            
            // Mapear idiomas para modelos Mozilla TTS
            const languageModels = {
                'pt': 'tts_models/pt/cv/vits',
                'en': 'tts_models/en/ljspeech/tacotron2-DDC',
                'es': 'tts_models/es/mai/tacotron2-DDC',
                'fr': 'tts_models/fr/mai/tacotron2-DDC'
            };
            
            const model = languageModels[language] || languageModels['en'];
            
            // Gerar áudio com Mozilla TTS
            const command = `tts --text "${script.replace(/"/g, '\"')}" --out_path "${outputPath}" --model_name "${model}"`;
            const { stdout, stderr } = await execPromise(command, { timeout: 120000 });
            
            if (stderr && !stderr.includes('Warning')) {
                console.warn('Mozilla TTS warnings:', stderr);
            }
            
            // Converter para MP3
            const mp3Path = outputPath.replace('.wav', '.mp3');
            await execPromise(`ffmpeg -i "${outputPath}" -acodec mp3 -ab 128k "${mp3Path}"`);
            
            // Remover WAV original
            fs.unlinkSync(outputPath);
            
            return mp3Path;
            
        } catch (error) {
            throw new Error(`Mozilla TTS falhou: ${error.message}`);
        }
    }

    async generateWithGTTS(script, outputDir, executionId, language) {
        const outputPath = path.join(outputDir, `${executionId}_narration_gtts.mp3`);
        
        try {
            // Usar gTTS via Python
            const pythonScript = `
import gtts
import sys

text = sys.argv[1]
output_path = sys.argv[2]
lang = sys.argv[3]

try:
    tts = gtts.gTTS(text=text, lang=lang, slow=False)
    tts.save(output_path)
    print(f"Áudio salvo em: {output_path}")
except Exception as e:
    print(f"Erro: {e}")
    sys.exit(1)
`;
            
            // Salvar script Python temporário
            const tempScript = path.join(outputDir, 'temp_gtts.py');
            fs.writeFileSync(tempScript, pythonScript);
            
            // Executar script Python
            const command = `python3 "${tempScript}" "${script.replace(/"/g, '\"')}" "${outputPath}" "${language}"`;
            const { stdout } = await execPromise(command, { timeout: 60000 });
            
            console.log('gTTS output:', stdout);
            
            // Remover script temporário
            fs.unlinkSync(tempScript);
            
            return outputPath;
            
        } catch (error) {
            // Fallback: tentar instalar gTTS
            try {
                console.log('Tentando instalar gTTS...');
                await execPromise('pip3 install gtts');
                return await this.generateWithGTTS(script, outputDir, executionId, language);
            } catch (installError) {
                throw new Error(`gTTS falhou: ${error.message}`);
            }
        }
    }

    async generateWithEspeak(script, outputDir, executionId, language) {
        const outputPath = path.join(outputDir, `${executionId}_narration_espeak.wav`);
        
        try {
            // Verificar se espeak está instalado
            await execPromise('which espeak');
            
            // Mapear idiomas para vozes eSpeak
            const languageVoices = {
                'pt': 'pt-br',
                'en': 'en',
                'es': 'es',
                'fr': 'fr',
                'de': 'de'
            };
            
            const voice = languageVoices[language] || 'en';
            
            // Gerar áudio com eSpeak
            const command = `espeak -v ${voice} -s 150 -p 50 -a 100 "${script.replace(/"/g, '\"')}" -w "${outputPath}"`;
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

    async generateSilentAudio(script, outputDir, executionId) {
        const outputPath = path.join(outputDir, `${executionId}_narration_silent.mp3`);
        
        try {
            // Calcular duração baseada no comprimento do texto
            const wordsPerMinute = 150;
            const words = script.split(' ').length;
            const durationSeconds = Math.max(10, (words / wordsPerMinute) * 60);
            
            // Gerar áudio silencioso com FFmpeg
            const command = `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t ${durationSeconds} -acodec mp3 "${outputPath}"`;
            await execPromise(command);
            
            console.warn(`Áudio silencioso gerado com ${durationSeconds.toFixed(1)}s de duração`);
            return outputPath;
            
        } catch (error) {
            throw new Error(`Geração de áudio silencioso falhou: ${error.message}`);
        }
    }

    // Método para configurar APIs facilmente
    async setupAPIs() {
        console.log('🔧 Configurando APIs de TTS...');
        
        // Adicionar APIs a partir de variáveis de ambiente
        if (process.env.HUGGINGFACE_API_KEY) {
            await this.credentialManager.addTTSAPI('Hugging Face', process.env.HUGGINGFACE_API_KEY, {
                service_type: 'huggingface',
                quota_limit: 100,
                quota_reset_period: 'daily',
                rate_limit_ms: 2000
            });
            console.log('✅ Hugging Face TTS API configurada');
        }
        
        // Adicionar múltiplas keys se disponíveis
        for (let i = 2; i <= 5; i++) {
            const keyVar = `HUGGINGFACE_API_KEY_${i}`;
            if (process.env[keyVar]) {
                await this.credentialManager.addTTSAPI(`Hugging Face ${i}`, process.env[keyVar], {
                    service_type: 'huggingface',
                    quota_limit: 100,
                    quota_reset_period: 'daily',
                    rate_limit_ms: 2000
                });
                console.log(`✅ Hugging Face TTS API ${i} configurada`);
            }
        }
    }

    // Método para obter estatísticas
    async getStats() {
        return await this.credentialManager.getUsageStats('text_to_speech');
    }

    // Métodos de compatibilidade com versão anterior
    async generateWithMozillaTTS(script, outputPath, executionId) {
        return await this.generateWithMozillaTTS(script, path.dirname(outputPath), executionId, 'pt');
    }

    async generateWithEspeak(script, outputPath, executionId) {
        return await this.generateWithEspeak(script, path.dirname(outputPath), executionId, 'pt');
    }

    async generateWithGTTS(script, outputPath, executionId) {
        return await this.generateWithGTTS(script, path.dirname(outputPath), executionId, 'pt');
    }
}

module.exports = TTSGeneratorPremium;