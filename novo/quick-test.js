#!/usr/bin/env node

/**
 * Teste rápido para verificar se todas as alternativas GCP-free funcionam
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Cores para output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

class QuickTest {
    constructor() {
        this.results = {
            systemTools: {},
            pythonLibs: {},
            nodeModules: {},
            services: {}
        };
        this.testDir = './quick-test-output';
    }

    async run() {
        log('blue', '🚀 Iniciando teste rápido do pipeline GCP-free...');
        
        try {
            await this.setupTestDir();
            await this.testSystemTools();
            await this.testPythonLibraries();
            await this.testNodeModules();
            await this.testServices();
            await this.generateReport();
        } catch (error) {
            log('red', `❌ Erro durante o teste: ${error.message}`);
            process.exit(1);
        } finally {
            await this.cleanup();
        }
    }

    async setupTestDir() {
        if (!fs.existsSync(this.testDir)) {
            fs.mkdirSync(this.testDir, { recursive: true });
        }
        log('blue', '📁 Diretório de teste criado');
    }

    async testSystemTools() {
        log('yellow', '\n🔧 Testando ferramentas do sistema...');
        
        const tools = [
            { name: 'ffmpeg', cmd: 'ffmpeg -version', required: true },
            { name: 'python3', cmd: 'python3 --version', required: true },
            { name: 'espeak', cmd: 'espeak --version', required: false },
            { name: 'imagemagick', cmd: 'convert -version', required: false },
            { name: 'festival', cmd: 'festival --version', required: false }
        ];

        for (const tool of tools) {
            try {
                const { stdout, stderr } = await execPromise(tool.cmd);
                const version = (stdout || stderr).split('\n')[0];
                this.results.systemTools[tool.name] = { status: 'ok', version };
                log('green', `✅ ${tool.name}: ${version}`);
            } catch (error) {
                this.results.systemTools[tool.name] = { status: 'error', error: error.message };
                const symbol = tool.required ? '❌' : '⚠️';
                const color = tool.required ? 'red' : 'yellow';
                log(color, `${symbol} ${tool.name}: Não encontrado${tool.required ? ' (OBRIGATÓRIO)' : ' (opcional)'}`);
            }
        }
    }

    async testPythonLibraries() {
        log('yellow', '\n🐍 Testando bibliotecas Python...');
        
        const libs = [
            { name: 'TTS', import: 'TTS', required: false },
            { name: 'gTTS', import: 'gtts', required: false },
            { name: 'Pillow', import: 'PIL', required: false }
        ];

        for (const lib of libs) {
            try {
                await execPromise(`python3 -c "import ${lib.import}; print('${lib.name} OK')"`); 
                this.results.pythonLibs[lib.name] = { status: 'ok' };
                log('green', `✅ ${lib.name}: Disponível`);
            } catch (error) {
                this.results.pythonLibs[lib.name] = { status: 'error', error: error.message };
                const symbol = lib.required ? '❌' : '⚠️';
                const color = lib.required ? 'red' : 'yellow';
                log(color, `${symbol} ${lib.name}: Não encontrado${lib.required ? ' (OBRIGATÓRIO)' : ' (opcional)'}`);
            }
        }
    }

    async testNodeModules() {
        log('yellow', '\n🟢 Testando módulos Node.js...');
        
        const modules = [
            { name: 'axios', required: true },
            { name: 'googleapis', required: true },
            { name: '@google/generative-ai', required: true },
            { name: 'editly', required: false },
            { name: 'fluent-ffmpeg', required: false },
            { name: 'sharp', required: false }
        ];

        for (const mod of modules) {
            try {
                require.resolve(mod.name);
                this.results.nodeModules[mod.name] = { status: 'ok' };
                log('green', `✅ ${mod.name}: Instalado`);
            } catch (error) {
                this.results.nodeModules[mod.name] = { status: 'error', error: error.message };
                const symbol = mod.required ? '❌' : '⚠️';
                const color = mod.required ? 'red' : 'yellow';
                log(color, `${symbol} ${mod.name}: Não encontrado${mod.required ? ' (OBRIGATÓRIO)' : ' (opcional)'}`);
            }
        }
    }

    async testServices() {
        log('yellow', '\n🌍 Testando serviços alternativos...');
        
        // Teste de geração de imagem
        await this.testImageGeneration();
        
        // Teste de TTS
        await this.testTTS();
        
        // Teste de processamento de vídeo
        await this.testVideoProcessing();
    }

    async testImageGeneration() {
        try {
            log('blue', '🆼️ Testando geração de imagens...');
            
            // Testar acesso a Pollinations (gratuito)
            const axios = require('axios');
            const response = await axios.get('https://image.pollinations.ai/prompt/test%20image', {
                timeout: 10000,
                responseType: 'stream'
            });
            
            const testImagePath = path.join(this.testDir, 'test_image.png');
            const writer = fs.createWriteStream(testImagePath);
            response.data.pipe(writer);
            
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
            
            this.results.services.imageGeneration = { status: 'ok', service: 'pollinations' };
            log('green', '✅ Geração de imagens: Pollinations OK');
            
        } catch (error) {
            this.results.services.imageGeneration = { status: 'error', error: error.message };
            log('yellow', '⚠️ Geração de imagens: Falhará para placeholder');
        }
    }

    async testTTS() {
        try {
            log('blue', '🎧 Testando Text-to-Speech...');
            
            const testText = 'Este é um teste de voz';
            const testAudioPath = path.join(this.testDir, 'test_audio.mp3');
            
            // Tentar gTTS primeiro
            try {
                const pythonScript = `
import gtts
tts = gtts.gTTS(text='${testText}', lang='pt')
tts.save('${testAudioPath}')
print('gTTS OK')
`;
                
                const tempScript = path.join(this.testDir, 'test_gtts.py');
                fs.writeFileSync(tempScript, pythonScript);
                
                await execPromise(`python3 "${tempScript}"`, { timeout: 15000 });
                
                this.results.services.tts = { status: 'ok', service: 'gTTS' };
                log('green', '✅ Text-to-Speech: gTTS OK');
                
            } catch (gttsError) {
                // Tentar eSpeak como fallback
                try {
                    await execPromise(`espeak -v pt-br "${testText}" -w "${testAudioPath.replace('.mp3', '.wav')}"`);
                    this.results.services.tts = { status: 'ok', service: 'eSpeak' };
                    log('green', '✅ Text-to-Speech: eSpeak OK');
                } catch (espeakError) {
                    throw new Error('Nenhum serviço TTS disponível');
                }
            }
            
        } catch (error) {
            this.results.services.tts = { status: 'error', error: error.message };
            log('yellow', '⚠️ Text-to-Speech: Falhará para áudio silencioso');
        }
    }

    async testVideoProcessing() {
        try {
            log('blue', '🎥 Testando processamento de vídeo...');
            
            // Criar imagem de teste simples
            const testImagePath = path.join(this.testDir, 'test_frame.png');
            await execPromise(`ffmpeg -y -f lavfi -i color=red:size=320x240:duration=1 -frames:v 1 "${testImagePath}"`);
            
            // Criar áudio de teste silencioso
            const testAudioPath = path.join(this.testDir, 'test_silent.mp3');
            await execPromise(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 2 -acodec mp3 "${testAudioPath}"`);
            
            // Criar vídeo de teste
            const testVideoPath = path.join(this.testDir, 'test_video.mp4');
            await execPromise(`ffmpeg -y -loop 1 -i "${testImagePath}" -i "${testAudioPath}" -c:v libx264 -tune stillimage -c:a aac -pix_fmt yuv420p -shortest "${testVideoPath}"`);
            
            this.results.services.videoProcessing = { status: 'ok', service: 'ffmpeg' };
            log('green', '✅ Processamento de vídeo: FFmpeg OK');
            
        } catch (error) {
            this.results.services.videoProcessing = { status: 'error', error: error.message };
            log('red', '❌ Processamento de vídeo: FALHOU (CRITICAL)');
        }
    }

    async generateReport() {
        log('yellow', '\n📄 Gerando relatório...');
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: this.generateSummary(),
            details: this.results,
            recommendations: this.generateRecommendations()
        };
        
        const reportPath = path.join(this.testDir, 'test_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        log('blue', '\n📈 RESUMO DO TESTE:');
        console.log(report.summary);
        
        if (report.recommendations.length > 0) {
            log('yellow', '\n💡 RECOMENDAÇÕES:');
            report.recommendations.forEach(rec => console.log(`   ${rec}`));
        }
        
        log('green', `\n🎉 Relatório completo salvo em: ${reportPath}`);
    }

    generateSummary() {
        let ready = true;
        const issues = [];
        
        // Verificar ferramentas obrigatórias
        if (this.results.systemTools.ffmpeg?.status !== 'ok') {
            ready = false;
            issues.push('FFmpeg não encontrado (OBRIGATÓRIO)');
        }
        
        if (this.results.systemTools.python3?.status !== 'ok') {
            ready = false;
            issues.push('Python3 não encontrado (OBRIGATÓRIO)');
        }
        
        // Verificar módulos Node obrigatórios
        const requiredModules = ['axios', 'googleapis', '@google/generative-ai'];
        for (const mod of requiredModules) {
            if (this.results.nodeModules[mod]?.status !== 'ok') {
                ready = false;
                issues.push(`Módulo Node.js '${mod}' não encontrado (OBRIGATÓRIO)`);
            }
        }
        
        return {
            ready,
            issues,
            status: ready ? 'PRONTO PARA USAR' : 'PRECISA DE CONFIGURAÇÃO',
            optionalServicesAvailable: {
                imageGeneration: this.results.services.imageGeneration?.status === 'ok',
                tts: this.results.services.tts?.status === 'ok',
                videoProcessing: this.results.services.videoProcessing?.status === 'ok'
            }
        };
    }

    generateRecommendations() {
        const recs = [];
        
        if (this.results.systemTools.ffmpeg?.status !== 'ok') {
            recs.push('Instale FFmpeg: sudo apt-get install ffmpeg');
        }
        
        if (this.results.systemTools.espeak?.status !== 'ok') {
            recs.push('Instale eSpeak para TTS local: sudo apt-get install espeak espeak-data');
        }
        
        if (this.results.pythonLibs.gTTS?.status !== 'ok') {
            recs.push('Instale gTTS para melhor qualidade de voz: pip3 install gtts');
        }
        
        if (this.results.pythonLibs.TTS?.status !== 'ok') {
            recs.push('Instale Mozilla TTS para voz premium: pip3 install TTS');
        }
        
        if (this.results.nodeModules.editly?.status !== 'ok') {
            recs.push('Instale Editly para melhor edição de vídeo: npm install editly');
        }
        
        return recs;
    }

    async cleanup() {
        try {
            // Manter apenas o relatório, remover arquivos de teste
            const files = fs.readdirSync(this.testDir);
            for (const file of files) {
                if (file !== 'test_report.json') {
                    const filePath = path.join(this.testDir, file);
                    fs.unlinkSync(filePath);
                }
            }
            log('blue', '🧩 Arquivos de teste removidos');
        } catch (error) {
            console.warn('Erro na limpeza:', error.message);
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const test = new QuickTest();
    test.run().catch(console.error);
}

module.exports = QuickTest;