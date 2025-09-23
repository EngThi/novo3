#!/usr/bin/env node

/**
 * Script de teste para as alternativas GCP-free
 * Testa cada módulo individualmente para identificar problemas
 */

const fs = require('fs');
const path = require('path');

// Importar módulos alternativos
let ImageGenerator, TTSGenerator, VideoProcessor, StorageManager;

try {
    ImageGenerator = require('./modules/image-generator-free');
    TTSGenerator = require('./modules/tts-generator-free');
    VideoProcessor = require('./modules/video-processor-free');
    StorageManager = require('./modules/storage-manager-free');
} catch (error) {
    console.error('❌ Erro ao importar módulos:', error.message);
    console.log('Certifique-se de que todos os arquivos dos módulos existem.');
    process.exit(1);
}

class AlternativesTest {
    constructor() {
        this.testDir = './test-alternatives-output';
        this.results = {};
    }

    async run() {
        console.log('🧪 Iniciando testes das alternativas GCP-free...');
        
        await this.setupTestDir();
        
        await this.testImageGeneration();
        await this.testTTSGeneration();
        await this.testVideoProcessing();
        await this.testStorageManager();
        
        await this.generateReport();
        await this.cleanup();
        
        console.log('🎉 Testes concluídos!');
    }

    async setupTestDir() {
        if (fs.existsSync(this.testDir)) {
            fs.rmSync(this.testDir, { recursive: true, force: true });
        }
        fs.mkdirSync(this.testDir, { recursive: true });
        console.log('📁 Diretório de teste criado');
    }

    async testImageGeneration() {
        console.log('\n🆼️ Testando geração de imagens...');
        
        try {
            const imageGen = new ImageGenerator();
            const prompts = [
                { prompt: 'beautiful landscape with mountains', negativePrompt: 'ugly, distorted' },
                { prompt: 'modern city skyline at sunset', negativePrompt: 'blur, noise' }
            ];
            
            const results = await imageGen.generateImages(prompts, this.testDir, 'test');
            
            this.results.imageGeneration = {
                success: true,
                images_generated: results.length,
                services_used: results.map(r => r.service),
                paths: results.map(r => r.path)
            };
            
            console.log(`✅ ${results.length} imagens geradas com sucesso`);
            results.forEach((result, i) => {
                console.log(`   ${i+1}. ${result.service}: ${path.basename(result.path)}`);
            });
            
        } catch (error) {
            this.results.imageGeneration = {
                success: false,
                error: error.message
            };
            console.error('❌ Falha na geração de imagens:', error.message);
        }
    }

    async testTTSGeneration() {
        console.log('\n🎧 Testando geração de áudio TTS...');
        
        try {
            const ttsGen = new TTSGenerator();
            const testScript = 'Esta é uma narração de teste para o pipeline de automação de vídeos. O sistema está funcionando corretamente com alternativas gratuitas ao Google Cloud.';
            
            const audioPath = await ttsGen.generateAudio(testScript, this.testDir, 'test');
            
            this.results.ttsGeneration = {
                success: true,
                audio_path: audioPath,
                file_size: fs.statSync(audioPath).size
            };
            
            console.log(`✅ Áudio gerado: ${path.basename(audioPath)}`);
            console.log(`   Tamanho: ${(this.results.ttsGeneration.file_size / 1024).toFixed(1)} KB`);
            
        } catch (error) {
            this.results.ttsGeneration = {
                success: false,
                error: error.message
            };
            console.error('❌ Falha na geração de TTS:', error.message);
        }
    }

    async testVideoProcessing() {
        console.log('\n🎥 Testando processamento de vídeo...');
        
        try {
            // Primeiro verificar se temos imagens e áudio dos testes anteriores
            const images = this.results.imageGeneration?.paths || [];
            const audio = this.results.ttsGeneration?.audio_path;
            
            if (images.length === 0) {
                throw new Error('Nenhuma imagem disponível dos testes anteriores');
            }
            
            if (!audio) {
                throw new Error('Nenhum áudio disponível dos testes anteriores');
            }
            
            const videoProc = new VideoProcessor();
            const outputPath = path.join(this.testDir, 'test_video.mp4');
            
            const videoPath = await videoProc.createVideo({
                images,
                audio,
                output: outputPath,
                executionId: 'test'
            });
            
            this.results.videoProcessing = {
                success: true,
                video_path: videoPath,
                file_size: fs.statSync(videoPath).size
            };
            
            console.log(`✅ Vídeo criado: ${path.basename(videoPath)}`);
            console.log(`   Tamanho: ${(this.results.videoProcessing.file_size / 1024 / 1024).toFixed(1)} MB`);
            
        } catch (error) {
            this.results.videoProcessing = {
                success: false,
                error: error.message
            };
            console.error('❌ Falha no processamento de vídeo:', error.message);
        }
    }

    async testStorageManager() {
        console.log('\n📁 Testando gerenciamento de armazenamento...');
        
        try {
            const storage = new StorageManager();
            
            // Coletar todos os assets dos testes
            const assets = {
                script: 'Este é um roteiro de teste para o pipeline GCP-free.',
                images: this.results.imageGeneration?.paths || [],
                audio: this.results.ttsGeneration?.audio_path,
                video: this.results.videoProcessing?.video_path
            };
            
            // Filtrar assets que realmente existem
            const filteredAssets = {};
            for (const [key, value] of Object.entries(assets)) {
                if (key === 'script') {
                    filteredAssets[key] = value;
                } else if (Array.isArray(value) && value.length > 0) {
                    filteredAssets[key] = value;
                } else if (value && fs.existsSync(value)) {
                    filteredAssets[key] = value;
                }
            }
            
            const storageResults = await storage.saveAllAssets(filteredAssets, 'test_execution');
            
            this.results.storageManager = {
                success: true,
                assets_saved: Object.keys(filteredAssets).length,
                storage_results: storageResults
            };
            
            console.log(`✅ ${Object.keys(filteredAssets).length} assets salvos`);
            console.log(`   Local: ${storageResults.metadata.storage_type}`);
            console.log(`   Execução ID: ${storageResults.executionId}`);
            
        } catch (error) {
            this.results.storageManager = {
                success: false,
                error: error.message
            };
            console.error('❌ Falha no gerenciamento de armazenamento:', error.message);
        }
    }

    async generateReport() {
        console.log('\n📄 Gerando relatório de testes...');
        
        const report = {
            timestamp: new Date().toISOString(),
            overall_success: this.calculateOverallSuccess(),
            modules_tested: Object.keys(this.results).length,
            results: this.results,
            summary: this.generateSummary()
        };
        
        const reportPath = path.join(this.testDir, 'alternatives_test_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // Exibir resumo no console
        console.log('\n📈 RESUMO DOS TESTES:');
        console.log(`Status Geral: ${report.overall_success ? '✅ SUCESSO' : '❌ FALHA'}`);
        console.log(`Módulos Testados: ${report.modules_tested}`);
        
        Object.entries(this.results).forEach(([module, result]) => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${module}: ${result.success ? 'OK' : result.error}`);
        });
        
        console.log(`\nRelatório completo: ${reportPath}`);
    }

    calculateOverallSuccess() {
        const results = Object.values(this.results);
        if (results.length === 0) return false;
        
        // Pelo menos os módulos críticos devem funcionar
        const criticalModules = ['ttsGeneration', 'storageManager'];
        const criticalSuccess = criticalModules.every(module => 
            this.results[module] && this.results[module].success
        );
        
        return criticalSuccess;
    }

    generateSummary() {
        const successful = Object.values(this.results).filter(r => r.success).length;
        const total = Object.values(this.results).length;
        
        return {
            modules_successful: successful,
            modules_total: total,
            success_rate: total > 0 ? (successful / total * 100).toFixed(1) + '%' : '0%',
            ready_for_production: this.calculateOverallSuccess(),
            recommendations: this.generateRecommendations()
        };
    }

    generateRecommendations() {
        const recs = [];
        
        if (!this.results.imageGeneration?.success) {
            recs.push('Instalar ImageMagick ou Canvas para geração de placeholders');
        }
        
        if (!this.results.ttsGeneration?.success) {
            recs.push('Instalar gTTS (pip3 install gtts) ou eSpeak');
        }
        
        if (!this.results.videoProcessing?.success) {
            recs.push('Verificar instalação do FFmpeg e instalar Editly (npm install editly)');
        }
        
        if (this.calculateOverallSuccess()) {
            recs.push('Sistema pronto para produção! Execute node pipeline-gcp-free.js');
        }
        
        return recs;
    }

    async cleanup() {
        // Manter apenas o relatório, remover outros arquivos de teste
        try {
            const files = fs.readdirSync(this.testDir);
            for (const file of files) {
                if (!file.includes('report')) {
                    const filePath = path.join(this.testDir, file);
                    fs.unlinkSync(filePath);
                }
            }
            console.log('🧩 Arquivos temporários removidos');
        } catch (error) {
            console.warn('Aviso na limpeza:', error.message);
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const test = new AlternativesTest();
    test.run().catch(error => {
        console.error('❌ Erro crítico nos testes:', error);
        process.exit(1);
    });
}

module.exports = AlternativesTest;