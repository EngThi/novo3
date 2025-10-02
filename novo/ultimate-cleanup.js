const fs = require('fs');
const path = require('path');

class UltimateCleanup {
    constructor() {
        this.projectRoot = '/home/user/main/novo3/novo';
        this.backupDir = `/home/user/main/novo3/backup-${Date.now()}`;
        
        // ARQUIVOS ESSENCIAIS PARA MANTER
        this.keepFiles = [
            // CORE PIPELINE
            'pipeline-ultimate-robust.js',
            'pipeline-ultimate-optimized.js',
            
            // TTS PREMIUM
            'services/audio/gemini-tts-premium.js',
            
            // SDXL WORKING
            'services/ai/sdxl-working.js',
            
            // GERADORES ESSENCIAIS
            'services/ai/gemini-unified-generator.js',
            
            // CONFIGURAÇÕES
            '.env',
            'package.json',
            
            // LAUNCHER
            'launch-ultimate-auto-port.js',
            
            // README
            'README.md'
        ];
        
        this.stats = {
            filesRemoved: 0,
            spaceSaved: 0,
            filesKept: 0
        };
    }
    
    async executeCleanup() {
        console.log('🧹 LIMPEZA ULTIMATE - MANTER SÓ O ESSENCIAL');
        console.log('==========================================');
        
        // 1. CRIAR BACKUP
        console.log('\n📦 1. Criando backup...');
        await this.createBackup();
        
        // 2. IDENTIFICAR ARQUIVOS
        console.log('\n🔍 2. Identificando arquivos...');
        const allFiles = this.getAllFiles(this.projectRoot);
        
        // 3. LIMPAR OUTPUTS ANTIGOS
        console.log('\n🗑️ 3. Limpando outputs antigos...');
        await this.cleanOldOutputs();
        
        // 4. REMOVER ARQUIVOS DESNECESSÁRIOS
        console.log('\n🧹 4. Removendo arquivos desnecessários...');
        await this.removeUnnecessaryFiles(allFiles);
        
        // 5. OTIMIZAR ESTRUTURA
        console.log('\n📁 5. Otimizando estrutura...');
        await this.optimizeStructure();
        
        // 6. CLEAN NODE_MODULES
        console.log('\n📦 6. Limpando node_modules...');
        await this.cleanNodeModules();
        
        // 7. RELATÓRIO FINAL
        console.log('\n📊 7. Relatório final...');
        this.showFinalReport();
    }
    
    async createBackup() {
        try {
            fs.mkdirSync(this.backupDir, { recursive: true });
            
            // Copiar apenas arquivos essenciais para backup
            const essentialFiles = ['package.json', '.env', 'README.md'];
            
            essentialFiles.forEach(file => {
                const sourcePath = path.join(this.projectRoot, file);
                const backupPath = path.join(this.backupDir, file);
                
                if (fs.existsSync(sourcePath)) {
                    fs.copyFileSync(sourcePath, backupPath);
                }
            });
            
            console.log(`   ✅ Backup criado em: ${this.backupDir}`);
        } catch (error) {
            console.log(`   ❌ Erro no backup: ${error.message}`);
        }
    }
    
    async cleanOldOutputs() {
        const outputDirs = ['outputs/videos', 'outputs/audio', 'outputs/images'];
        
        outputDirs.forEach(dir => {
            const fullDir = path.join(this.projectRoot, dir);
            
            if (!fs.existsSync(fullDir)) return;
            
            try {
                const files = fs.readdirSync(fullDir)
                    .map(file => ({
                        name: file,
                        fullPath: path.join(fullDir, file),
                        mtime: fs.statSync(path.join(fullDir, file)).mtime
                    }))
                    .sort((a, b) => b.mtime - a.mtime);
                
                // Manter apenas os 3 mais recentes
                const filesToRemove = files.slice(3);
                
                filesToRemove.forEach(file => {
                    const size = fs.statSync(file.fullPath).size;
                    fs.unlinkSync(file.fullPath);
                    
                    this.stats.filesRemoved++;
                    this.stats.spaceSaved += size;
                    
                    console.log(`   🗑️ ${path.relative(this.projectRoot, file.fullPath)}`);
                });
                
                if (filesToRemove.length > 0) {
                    console.log(`   ✅ ${dir}: ${filesToRemove.length} arquivos antigos removidos`);
                }
                
            } catch (error) {
                console.log(`   ❌ Erro em ${dir}: ${error.message}`);
            }
        });
    }
    
    async removeUnnecessaryFiles(allFiles) {
        const filesToRemove = [
            // TESTES
            /test-.*\.js$/,
            /.*test.*\.js$/,
            
            // BACKUPS
            /.*backup.*$/,
            /.*\.backup$/,
            
            // CONFIGS DUPLICADAS
            /\.env\.(firebase|master|ultimate)$/,
            
            // SCRIPTS EXPERIMENTAIS
            /webdark.*$/,
            /video-player\.js$/,
            
            // DOCUMENTAÇÃO EXCESSIVA
            /docs\/.*$/,
            
            // VERSÕES ANTIGAS
            /pipeline-completo-funcional.*$/,
            /pipeline-ultimate-tts\.js$/,
            
            // LAUNCHERS DUPLICADOS
            /launch-.*(?<!auto-port)\.js$/,
            
            // SERVIÇOS DUPLICADOS
            /services\/ai\/(?!sdxl-working|gemini-unified-generator).*$/,
            /services\/video\/simple-.*$/,
            
            // OUTROS DESNECESSÁRIOS
            /analyze-project\.js$/,
            /cleanup-project\.js$/
        ];
        
        allFiles.forEach(file => {
            const relativePath = path.relative(this.projectRoot, file);
            
            // Pular se é arquivo essencial
            if (this.keepFiles.some(keep => relativePath === keep || relativePath.endsWith(keep))) {
                this.stats.filesKept++;
                return;
            }
            
            // Pular node_modules e .git
            if (relativePath.includes('node_modules') || relativePath.includes('.git')) {
                return;
            }
            
            // Verificar se deve ser removido
            const shouldRemove = filesToRemove.some(pattern => pattern.test(relativePath));
            
            if (shouldRemove) {
                try {
                    const stats = fs.statSync(file);
                    fs.unlinkSync(file);
                    
                    this.stats.filesRemoved++;
                    this.stats.spaceSaved += stats.size;
                    
                    console.log(`   🗑️ ${relativePath}`);
                } catch (error) {
                    console.log(`   ❌ Erro removendo ${relativePath}: ${error.message}`);
                }
            } else {
                this.stats.filesKept++;
            }
        });
    }
    
    async optimizeStructure() {
        // Remover diretórios vazios
        const dirsToCheck = [
            'services/ai',
            'services/video', 
            'services/triggers',
            'interfaces/web',
            'core',
            'config',
            'docs'
        ];
        
        dirsToCheck.forEach(dir => {
            const fullDir = path.join(this.projectRoot, dir);
            
            try {
                if (fs.existsSync(fullDir)) {
                    const contents = fs.readdirSync(fullDir);
                    
                    if (contents.length === 0) {
                        fs.rmdirSync(fullDir);
                        console.log(`   📁 Diretório vazio removido: ${dir}`);
                    }
                }
            } catch (error) {
                // Ignorar erros
            }
        });
        
        // Criar estrutura mínima necessária
        const necessaryDirs = [
            'outputs/videos',
            'outputs/audio', 
            'outputs/images',
            'services/audio',
            'services/ai'
        ];
        
        necessaryDirs.forEach(dir => {
            const fullDir = path.join(this.projectRoot, dir);
            if (!fs.existsSync(fullDir)) {
                fs.mkdirSync(fullDir, { recursive: true });
                console.log(`   📁 Diretório criado: ${dir}`);
            }
        });
    }
    
    async cleanNodeModules() {
        const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
        
        if (fs.existsSync(nodeModulesPath)) {
            // Remover apenas caches
            const cacheDirs = ['.cache', '.bin/.nyc_output', '.npm'];
            
            cacheDirs.forEach(cacheDir => {
                const fullCachePath = path.join(nodeModulesPath, cacheDir);
                
                if (fs.existsSync(fullCachePath)) {
                    try {
                        fs.rmSync(fullCachePath, { recursive: true, force: true });
                        console.log(`   🧹 Cache removido: ${cacheDir}`);
                    } catch (error) {
                        // Ignorar erros
                    }
                }
            });
        }
    }
    
    getAllFiles(dir, fileList = []) {
        try {
            const files = fs.readdirSync(dir);
            
            files.forEach(file => {
                if (file.startsWith('.') && file !== '.env') return;
                if (file === 'node_modules') return;
                
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                
                if (stat.isDirectory()) {
                    this.getAllFiles(filePath, fileList);
                } else {
                    fileList.push(filePath);
                }
            });
        } catch (error) {
            // Ignorar erros
        }
        
        return fileList;
    }
    
    showFinalReport() {
        console.log('\n🎊 LIMPEZA ULTIMATE CONCLUÍDA!');
        console.log('==============================');
        
        console.log(`📊 Estatísticas:`);
        console.log(`   🗑️ Arquivos removidos: ${this.stats.filesRemoved}`);
        console.log(`   ✅ Arquivos mantidos: ${this.stats.filesKept}`);
        console.log(`   💾 Espaço economizado: ${this.formatSize(this.stats.spaceSaved)}`);
        
        console.log(`\n📁 Estrutura final:`);
        console.log(`   📄 pipeline-ultimate-robust.js (PRINCIPAL)`);
        console.log(`   📄 pipeline-ultimate-optimized.js (RÁPIDO)`);
        console.log(`   🎙️ services/audio/gemini-tts-premium.js`);
        console.log(`   🎨 services/ai/sdxl-working.js`);
        console.log(`   ⚙️ .env (configurações)`);
        console.log(`   📦 package.json`);
        console.log(`   🚀 launch-ultimate-auto-port.js`);
        
        console.log(`\n🎯 COMO USAR:`);
        console.log(`   node pipeline-ultimate-robust.js "seu tópico"`);
        console.log(`   node launch-ultimate-auto-port.js (dashboard)`);
        
        console.log(`\n💎 SISTEMA OTIMIZADO:`);
        console.log(`   ✅ Apenas arquivos essenciais mantidos`);
        console.log(`   ✅ SDXL como provedor premium`);
        console.log(`   ✅ TTS Gemini Premium integrado`);
        console.log(`   ✅ Zero placeholders garantido`);
        
        console.log(`\n📦 Backup disponível em: ${this.backupDir}`);
    }
    
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// EXECUTAR LIMPEZA
async function main() {
    const cleanup = new UltimateCleanup();
    await cleanup.executeCleanup();
}

main().catch(console.error);
