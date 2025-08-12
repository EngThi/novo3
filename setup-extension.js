// setup-extension.js
const fs = require('fs-extra');
const path = require('path');

async function setupAutomatedEnvironment() {
    console.log('🔧 SETUP AUTOMÁTICO - OPÇÃO 2: Ambiente Controlado');
    console.log('===================================================\n');
    
    console.log('📁 Criando estrutura de pastas...');
    const folders = [
        './extensions/torio-tools',
        './browser-profiles/whisk-automation',
        './downloads/whisk_downloads'
    ];
    
    for (const folder of folders) {
        await fs.ensureDir(folder);
        console.log(`✅ Diretório assegurado: ${folder}`);
    }
    
    console.log('\n📦 Copiando extensão TÓRIO TOOLS...');
    // ATENÇÃO: Verifique se este caminho de origem está correto no seu projeto.
    const extensionSource = './gerador-imagens-lote/gerador-imagens-lote/gerador-imagens-lote';
    const extensionTarget = './extensions/torio-tools';
    
    if (await fs.pathExists(extensionSource)) {
        await fs.copy(extensionSource, extensionTarget, { overwrite: true });
        console.log('✅ Extensão copiada com sucesso.');
        
        const manifestPath = path.join(extensionTarget, 'manifest.json');
        if (!(await fs.pathExists(manifestPath))) {
            console.error(`❌ ERRO: manifest.json não encontrado no destino após a cópia.`);
            return false;
        }
    } else {
        console.error(`❌ ERRO: Pasta de origem da extensão não encontrada em: ${extensionSource}`);
        console.warn('   -> A estrutura foi criada, mas você precisará copiar os arquivos da extensão manualmente.');
    }
    
    console.log('\n⚙️ Criando arquivo de configuração padrão...');
    const config = {
        whisk: {
            url: 'https://labs.google/fx/pt/tools/whisk',
            timeout: 300000,
            retries: 3
        },
        extension: {
            path: './extensions/torio-tools',
            name: 'TÓRIO TOOLS | Image Automation Loop'
        },
        browser: {
            headless: false,
            profile: './browser-profiles/whisk-automation',
            debugPort: 9223
        },
        downloads: {
            path: './downloads/whisk_downloads',
            timeout: 300000
        }
    };
    
    await fs.writeJson('./whisk-config.json', config, { spaces: 2 });
    console.log('✅ Configuração salva em whisk-config.json');
    
    console.log('\n🎉 SETUP CONCLUÍDO!');
    console.log('   Próximo passo: Verifique o resultado da renderização do vídeo atual.');
    console.log('   Depois, execute o pipeline novamente para usar o novo sistema.');
    
    return true;
}

if (require.main === module) {
    setupAutomatedEnvironment().catch(error => {
        console.error("\nOcorreu um erro durante o setup:", error);
    });
}

module.exports = { setupAutomatedEnvironment };
