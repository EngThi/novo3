/**
 * LIMPEZA FINAL - Remove últimos arquivos duplicados
 * Execute: node scripts/final-cleanup.js
 */

const fs = require('fs').promises;
const path = require('path');

class FinalCleanup {
    constructor() {
        this.baseDir = path.join(__dirname, '..');
        this.duplicatesToRemove = [
            // Arquivos duplicados restantes
            'novo/.encryption-key',              // Duplicado da pasta novo/
            'pipeline.js',                       // Manter só pipeline-gcp-free.js
            'quick-test.js',                     // Manter só test-components.js
            'voice-selector.js',                 // Será integrado aos services
            'stateManager.js',                   // Redundante (funcionalidade no cache)
            'setup-gcp-free.sh',                 // Script obsoleto
            'test-alternatives.js'               // Teste obsoleto
        ];
        
        this.foldersToRemove = [
            'novo/'                              // Pasta duplicada final
        ];
    }
    
    async analyzeRemaining() {
        console.log('🔍 ANÁLISE FINAL - Arquivos Duplicados Restantes\n');
        
        const analysis = {
            files: [],
            folders: [],
            totalSavings: 0
        };
        
        // Verificar arquivos
        for (const file of this.duplicatesToRemove) {
            const filePath = path.join(this.baseDir, file);
            try {
                const stats = await fs.stat(filePath);
                analysis.files.push({
                    path: file,
                    size: stats.size,
                    type: 'file'
                });
                analysis.totalSavings += stats.size;
                console.log(`❌ ${file} (${(stats.size/1024).toFixed(1)}KB)`);
            } catch (err) {
                console.log(`✅ ${file} (já removido)`);
            }
        }
        
        // Verificar pastas
        for (const folder of this.foldersToRemove) {
            const folderPath = path.join(this.baseDir, folder);
            try {
                const files = await this.getFolderSize(folderPath);
                analysis.folders.push({
                    path: folder,
                    fileCount: files.count,
                    size: files.size,
                    type: 'folder'
                });
                analysis.totalSavings += files.size;
                console.log(`❌ ${folder} (${files.count} arquivos, ${(files.size/1024).toFixed(1)}KB)`);
            } catch (err) {
                console.log(`✅ ${folder} (já removida)`);
            }
        }
        
        console.log(`\n💾 ECONOMIA TOTAL: ${(analysis.totalSavings/1024).toFixed(1)}KB`);
        console.log(`📁 ARQUIVOS A REMOVER: ${analysis.files.length}`);
        console.log(`🗂️  PASTAS A REMOVER: ${analysis.folders.length}`);
        
        return analysis;
    }
    
    async getFolderSize(folderPath) {
        let totalSize = 0;
        let fileCount = 0;
        
        try {
            const items = await fs.readdir(folderPath, { withFileTypes: true });
            
            for (const item of items) {
                const itemPath = path.join(folderPath, item.name);
                
                if (item.isDirectory()) {
                    const subFolder = await this.getFolderSize(itemPath);
                    totalSize += subFolder.size;
                    fileCount += subFolder.count;
                } else {
                    const stats = await fs.stat(itemPath);
                    totalSize += stats.size;
                    fileCount++;
                }
            }
        } catch (err) {
            // Pasta não existe ou não acessível
        }
        
        return { size: totalSize, count: fileCount };
    }
    
    generateCommands(analysis) {
        console.log('\n🗑️  COMANDOS DE LIMPEZA FINAL:\n');
        
        if (analysis.files.length > 0) {
            console.log('# REMOVER ARQUIVOS DUPLICADOS:');
            analysis.files.forEach(item => {
                console.log(`git rm ${item.path}`);
            });
        }
        
        if (analysis.folders.length > 0) {
            console.log('\n# REMOVER PASTAS DUPLICADAS:');
            analysis.folders.forEach(item => {
                console.log(`git rm -r ${item.path}`);
            });
        }
        
        console.log('\n# COMMIT LIMPEZA FINAL:');
        console.log('git add .');
        console.log('git commit -m "refactor: Final cleanup - remove last duplicates and obsolete files"');
        console.log('git push origin gcp-free');
        
        console.log('\n📊 ESTRUTURA FINAL ESPERADA:');
        console.log('novo/');
        console.log('├── config/           ✅ Enterprise config');
        console.log('├── utils/            ✅ Logger enterprise');
        console.log('├── services/         ✅ TTS, Cache, Image, Video');
        console.log('├── interfaces/       ✅ API server');
        console.log('├── core/             ✅ Pipeline core');
        console.log('├── templates/        ✅ Video templates');
        console.log('├── scripts/          ✅ Management scripts');
        console.log('├── .env.gcp-free     ✅ Production config');
        console.log('├── .env.example      ✅ Template');
        console.log('├── package.json      ✅ Dependencies');
        console.log('├── pipeline-gcp-free.js  ✅ Main pipeline');
        console.log('├── index.js          ✅ Entry point');
        console.log('├── firebase-studio-test.js  ✅ Integration test');
        console.log('└── test-components.js       ✅ Unit tests');
        
        console.log('\n✨ RESULTADO: Estrutura 100% limpa e enterprise!');
    }
    
    async run() {
        console.log('🧹 LIMPEZA FINAL - REPOSITÓRIO ENTERPRISE\n');
        console.log('=' .repeat(50));
        
        const analysis = await this.analyzeRemaining();
        
        if (analysis.files.length === 0 && analysis.folders.length === 0) {
            console.log('\n🎉 REPOSITÓRIO JÁ ESTÁ 100% LIMPO!');
            console.log('✅ Nenhum arquivo duplicado encontrado.');
            console.log('✅ Estrutura enterprise otimizada.');
            return;
        }
        
        this.generateCommands(analysis);
        
        console.log('\n⚠️  EXECUTE OS COMANDOS ACIMA PARA FINALIZAR A LIMPEZA!');
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const cleanup = new FinalCleanup();
    cleanup.run().catch(console.error);
}

module.exports = FinalCleanup;