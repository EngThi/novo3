const fs = require('fs');
const path = require('path');

class ProjectCleaner {
    constructor() {
        this.projectRoot = '/home/user/main/novo3/novo';
        this.totalSizeBefore = 0;
        this.totalSizeAfter = 0;
        this.filesRemoved = 0;
        this.foldersRemoved = 0;
        
        console.log('🧹 Project Cleaner V6.3');
        console.log('========================');
    }
    
    // ARQUIVOS DESNECESSÁRIOS/DUPLICADOS
    getFilesToRemove() {
        return [
            // === BACKUPS E VERSÕES ANTIGAS ===
            'pipeline-completo-funcional.js.backup',
            'dashboard-server-backup.js',
            'simple-video-generator-backup.js',
            
            // === ARQUIVOS DE TESTE/DEBUG ===
            'test-firestore-trigger.js',
            'video-player.js',
            'webdark-server.js',
            'launch-webdark.js',
            'webdark-pipeline-integration.js',
            
            // === VERSÕES DUPLICADAS/OBSOLETAS ===
            'pipeline-completo-funcional.js', // Usar só robust/optimized
            'pipeline-ultimate-tts.js',       // Integrado no robust
            'launch-ultimate-final.js',       // Usar só ultimate-auto-port
            'launch-integrated-ultimate.js',  // Duplicado
            'dashboard-server-with-real-video.js', // Usar ultimate integrado
            'dashboard-ultimate-integrated.js', // Escolher só um dashboard
            
            // === CONFIGS DUPLICADAS ===
            '.env.master',
            '.env.ultimate',
            '.env.firebase',
            
            // === SCRIPTS EXPERIMENTAIS ===
            'launch-dashboard-auto-port.js',
            'launch-ultimate-dashboard.js',
            'simple-video-generator-fixed.js',
            'simple-video-generator.js',
            
            // === SERVIÇOS DUPLICADOS/OBSOLETOS ===
            'services/ai/gemini-text-only.js',
            'services/ai/gemini-multi-provider.js', // Integrado no unified
            'services/ai/gemini-ultimate-real.js',  // Duplicado
            'services/video/simple-video-generator-backup.js',
            'services/video/simple-video-generator-fixed.js',
            'services/video/simple-video-generator.js',
            
            // === DOCUMENTAÇÃO REDUNDANTE ===
            'docs/FIRESTORE_SETUP_GUIDE.md' // Manter só se usar Firestore
        ];
    }
    
    // DIRETÓRIOS DESNECESSÁRIOS
    getFoldersToRemove() {
        return [
            'node_modules/.cache',
            'outputs/temp',
            '.git/logs', // Limpar logs git se muito grande
            'docs' // Se não usar documentação
        ];
    }
    
    // ARQUIVOS CORE QUE DEVEM SER MANTIDOS
    getCoreFiles() {
        return [
            // === PIPELINES PRINCIPAIS ===
            'pipeline-ultimate-robust.js',    // Sistema principal robusto
            'pipeline-ultimate-optimized.js', // Versão otimizada/rápida
            
            // === DASHBOARDS ===
            'launch-ultimate-auto-port.js',   // Launcher principal
            
            // === TTS PREMIUM ===
            'services/audio/gemini-tts-premium.js',
            
            // === GERADORES UNIFIED ===
            'services/ai/gemini-unified-generator.js',
            'services/ai/gemini-enterprise-rotation.js',
            'services/ai/nano-banana-image-generator.js',
            
            // === VIDEO ASSEMBLY ===
            'services/video/advanced-video-generator.js',
            'services/video/final-video-generator.js',
            
            // === CONFIGS ===
            '.env',
            'package.json',
            'README.md'
        ];
    }
    
    getDirectorySize(dirPath) {
        let totalSize = 0;
        
        if (!fs.existsSync(dirPath)) return 0;
        
        try {
            const items = fs.readdirSync(dirPath);
            
            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory()) {
                    totalSize += this.getDirectorySize(itemPath);
                } else {
                    totalSize += stats.size;
                }
            }
        } catch (error) {
            // Ignorar erros de permissão
        }
        
        return totalSize;
    }
    
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    async cleanOutputs() {
        console.log('\n🗑️ Limpando outputs antigos...');
        
        const outputDirs = [
            'outputs/videos',
            'outputs/audio', 
            'outputs/images'
        ];
        
        for (const dir of outputDirs) {
            const fullPath = path.join(this.projectRoot, dir);
            
            if (!fs.existsSync(fullPath)) continue;
            
            const files = fs.readdirSync(fullPath);
            const now = Date.now();
            const oneDayAgo = now - (24 * 60 * 60 * 1000); // 24 horas
            
            let removedCount = 0;
            let savedSpace = 0;
            
            for (const file of files) {
                const filePath = path.join(fullPath, file);
                const stats = fs.statSync(filePath);
                
                // Remover arquivos mais antigos que 24h
                if (stats.mtime.getTime() < oneDayAgo) {
                    savedSpace += stats.size;
                    fs.unlinkSync(filePath);
                    removedCount++;
                }
            }
            
            if (removedCount > 0) {
                console.log(`   ✅ ${dir}: ${removedCount} arquivos removidos (${this.formatSize(savedSpace)})`);
                this.filesRemoved += removedCount;
            }
        }
    }
    
    async cleanUnnecessaryFiles() {
        console.log('\n🗑️ Removendo arquivos desnecessários...');
        
        const filesToRemove = this.getFilesToRemove();
        
        for (const file of filesToRemove) {
            const fullPath = path.join(this.projectRoot, file);
            
            if (fs.existsSync(fullPath)) {
                const stats = fs.statSync(fullPath);
                fs.unlinkSync(fullPath);
                
                console.log(`   ✅ Removido: ${file} (${this.formatSize(stats.size)})`);
                this.filesRemoved++;
            }
        }
    }
    
    async cleanEmptyFolders() {
        console.log('\n🗑️ Removendo pastas vazias...');
        
        const foldersToCheck = [
            'services/ai',
            'services/video',
            'services/audio',
            'services/triggers',
            'interfaces/web',
            'core',
            'config',
            'docs'
        ];
        
        for (const folder of foldersToCheck) {
            const fullPath = path.join(this.projectRoot, folder);
            
            if (fs.existsSync(fullPath)) {
                try {
                    const items = fs.readdirSync(fullPath);
                    
                    if (items.length === 0) {
                        fs.rmdirSync(fullPath);
                        console.log(`   ✅ Pasta vazia removida: ${folder}`);
                        this.foldersRemoved++;
                    }
                } catch (error) {
                    // Ignorar erros
                }
            }
        }
    }
    
    async optimizePackageJson() {
        console.log('\n📦 Otimizando package.json...');
        
        const packagePath = path.join(this.projectRoot, 'package.json');
        
        if (fs.existsSync(packagePath)) {
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            
            // Remover scripts desnecessários
            const unnecessaryScripts = ['test', 'build', 'dev', 'start:dev'];
            
            if (packageJson.scripts) {
                for (const script of unnecessaryScripts) {
                    if (packageJson.scripts[script]) {
                        delete packageJson.scripts[script];
                        console.log(`   ✅ Script removido: ${script}`);
                    }
                }
            }
            
            // Manter só dependências essenciais
            const coreDependencies = [
                'express',
                'axios',
                'dotenv',
                'firebase-admin',
                'uuid'
            ];
            
            if (packageJson.dependencies) {
                const newDeps = {};
                for (const dep of coreDependencies) {
                    if (packageJson.dependencies[dep]) {
                        newDeps[dep] = packageJson.dependencies[dep];
                    }
                }
                packageJson.dependencies = newDeps;
            }
            
            // Remover devDependencies se existir
            if (packageJson.devDependencies) {
                delete packageJson.devDependencies;
                console.log('   ✅ devDependencies removidas');
            }
            
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
            console.log('   ✅ package.json otimizado');
        }
    }
    
    async cleanNodeModules() {
        console.log('\n📦 Limpando node_modules desnecessários...');
        
        const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
        
        if (fs.existsSync(nodeModulesPath)) {
            const sizeBefore = this.getDirectorySize(nodeModulesPath);
            
            // Remover caches
            const cacheDirs = [
                '.cache',
                '.npm',
                '.bin/.nyc_output'
            ];
            
            for (const cacheDir of cacheDirs) {
                const cachePath = path.join(nodeModulesPath, cacheDir);
                if (fs.existsSync(cachePath)) {
                    fs.rmSync(cachePath, { recursive: true, force: true });
                }
            }
            
            const sizeAfter = this.getDirectorySize(nodeModulesPath);
            const saved = sizeBefore - sizeAfter;
            
            if (saved > 0) {
                console.log(`   ✅ Cache limpo: ${this.formatSize(saved)} economizados`);
            }
        }
    }
    
    async generateCleanupReport() {
        console.log('\n📊 RELATÓRIO DE LIMPEZA');
        console.log('=========================');
        
        // Arquivos principais mantidos
        console.log('\n✅ ARQUIVOS CORE MANTIDOS:');
        const coreFiles = this.getCoreFiles();
        
        for (const file of coreFiles) {
            const fullPath = path.join(this.projectRoot, file);
            if (fs.existsSync(fullPath)) {
                const stats = fs.statSync(fullPath);
                console.log(`   📄 ${file} (${this.formatSize(stats.size)})`);
            }
        }
        
        // Estrutura final
        console.log('\n📁 ESTRUTURA FINAL:');
        this.listDirectory(this.projectRoot, '');
        
        // Estatísticas
        console.log('\n�� ESTATÍSTICAS:');
        console.log(`   🗑️ Arquivos removidos: ${this.filesRemoved}`);
        console.log(`   📁 Pastas removidas: ${this.foldersRemoved}`);
        console.log(`   💾 Espaço total: ${this.formatSize(this.totalSizeAfter)}`);
    }
    
    listDirectory(dirPath, indent) {
        try {
            const items = fs.readdirSync(dirPath).slice(0, 10); // Máximo 10 items
            
            for (const item of items) {
                if (item.startsWith('.') && item !== '.env') continue;
                
                const itemPath = path.join(dirPath, item);
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory()) {
                    console.log(`${indent}📁 ${item}/`);
                    if (indent.length < 6) { // Máximo 3 níveis
                        this.listDirectory(itemPath, indent + '   ');
                    }
                } else {
                    console.log(`${indent}📄 ${item} (${this.formatSize(stats.size)})`);
                }
            }
        } catch (error) {
            // Ignorar erros
        }
    }
    
    async runFullCleanup() {
        console.log('🧹 INICIANDO LIMPEZA COMPLETA...');
        console.log('=================================');
        
        // Medir tamanho inicial
        this.totalSizeBefore = this.getDirectorySize(this.projectRoot);
        console.log(`📊 Tamanho inicial: ${this.formatSize(this.totalSizeBefore)}`);
        
        // Executar limpezas
        await this.cleanOutputs();
        await this.cleanUnnecessaryFiles();
        await this.cleanEmptyFolders();
        await this.optimizePackageJson();
        await this.cleanNodeModules();
        
        // Medir tamanho final
        this.totalSizeAfter = this.getDirectorySize(this.projectRoot);
        const saved = this.totalSizeBefore - this.totalSizeAfter;
        
        console.log('\n🎊 LIMPEZA CONCLUÍDA!');
        console.log('====================');
        console.log(`💾 Espaço economizado: ${this.formatSize(saved)}`);
        console.log(`📦 Tamanho final: ${this.formatSize(this.totalSizeAfter)}`);
        
        await this.generateCleanupReport();
    }
}

// EXECUTAR LIMPEZA
async function main() {
    const cleaner = new ProjectCleaner();
    await cleaner.runFullCleanup();
}

main().catch(console.error);
