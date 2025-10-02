const fs = require('fs');
const path = require('path');

// OTIMIZAÇÃO ESPECÍFICA DO PIPELINE ULTIMATE
class PipelineOptimizer {
    constructor() {
        this.root = '/home/user/main/novo3/novo';
    }
    
    // Manter apenas arquivos essenciais
    async optimizeCore() {
        console.log('🎯 Otimizando Pipeline Ultimate...');
        
        // ARQUIVOS PRINCIPAIS A MANTER
        const keepFiles = [
            'pipeline-ultimate-robust.js',
            'pipeline-ultimate-optimized.js', 
            'services/audio/gemini-tts-premium.js',
            'services/ai/gemini-unified-generator.js',
            'services/triggers/firestore-image-trigger.js',
            '.env',
            'package.json'
        ];
        
        // REMOVER TUDO EXCETO OS ESSENCIAIS
        const allFiles = this.getAllFiles(this.root);
        
        for (const file of allFiles) {
            const relativePath = path.relative(this.root, file);
            
            // Pular diretórios especiais
            if (relativePath.includes('node_modules') || 
                relativePath.includes('.git') ||
                relativePath.includes('outputs')) {
                continue;
            }
            
            // Se não estiver na lista de manter, remover
            if (!keepFiles.some(keep => relativePath === keep)) {
                try {
                    fs.unlinkSync(file);
                    console.log(`   🗑️ Removido: ${relativePath}`);
                } catch (error) {
                    // Ignorar erros
                }
            }
        }
        
        console.log('✅ Otimização core concluída!');
    }
    
    getAllFiles(dir) {
        let files = [];
        
        try {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stats = fs.statSync(fullPath);
                
                if (stats.isDirectory()) {
                    files = files.concat(this.getAllFiles(fullPath));
                } else {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            // Ignorar erros
        }
        
        return files;
    }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
    const optimizer = new PipelineOptimizer();
    optimizer.optimizeCore();
}
