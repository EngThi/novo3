#!/usr/bin/env node

/**
 * Voice Selector - Utilitário para testar e selecionar vozes do Gemini TTS
 * Baseado no sistema de vozes do código HTML fornecido
 */

const GeminiTTSPremium = require('./modules/gemini-tts-premium');
const fs = require('fs');
const path = require('path');

class VoiceSelector {
    constructor() {
        this.outputDir = './voice_tests';
        this.testScript = "Este é um teste da voz para narração de mistérios brasileiros. A história que vamos contar é sobre um local misterioso no interior do Brasil, onde eventos inexplicáveis acontecem há décadas.";
        
        // Garantir que diretório existe
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    // === LISTAR TODAS AS VOZES DISPONÍVEIS ===
    listAllVoices() {
        const voices = GeminiTTSPremium.VOICE_PROFILES;
        
        console.log('🎙️ VOZES GEMINI 2.5 FLASH DISPONÍVEIS:\n');
        
        // Agrupar por categoria
        const categories = {
            'Femininas Claras': [],
            'Femininas Suaves': [],
            'Femininas Animadas': [],
            'Masculinas Firmes': [],
            'Tranquilas': [],
            'Especiais': []
        };
        
        Object.entries(voices).forEach(([name, profile]) => {
            const voiceInfo = {
                name,
                description: profile.description,
                gender: profile.gender,
                tone: profile.tone,
                ideal_for: profile.ideal_for
            };
            
            if (profile.tone === 'clara' || profile.tone === 'nítida') {
                categories['Femininas Claras'].push(voiceInfo);
            } else if (profile.tone === 'suave' && profile.gender === 'feminina') {
                categories['Femininas Suaves'].push(voiceInfo);
            } else if (profile.tone === 'animada' || profile.tone === 'excitada' || profile.tone === 'jovem') {
                categories['Femininas Animadas'].push(voiceInfo);
            } else if (profile.gender === 'masculina' && profile.tone === 'firme') {
                categories['Masculinas Firmes'].push(voiceInfo);
            } else if (profile.tone === 'tranquila') {
                categories['Tranquilas'].push(voiceInfo);
            } else {
                categories['Especiais'].push(voiceInfo);
            }
        });
        
        // Exibir categorias
        Object.entries(categories).forEach(([category, voiceList]) => {
            if (voiceList.length > 0) {
                console.log(`\n🏇 ${category.toUpperCase()}:`);
                voiceList.forEach(voice => {
                    console.log(`  🎙️  ${voice.name.padEnd(15)} - ${voice.description}`);
                    console.log(`       🎯 Ideal para: ${voice.ideal_for}`);
                });
            }
        });
        
        console.log(`\n📊 Total: ${Object.keys(voices).length} vozes disponíveis\n`);
    }

    // === RECOMENDAR VOZ POR TIPO DE CONTEÚDO ===
    recommendVoice(contentType) {
        const recommendedVoice = GeminiTTSPremium.selectOptimalVoice(contentType, this.testScript);
        const profile = GeminiTTSPremium.VOICE_PROFILES[recommendedVoice];
        
        console.log(`🎯 RECOMENDAÇÃO PARA "${contentType.toUpperCase()}":\n`);
        console.log(`🎙️ Voz recomendada: ${recommendedVoice}`);
        console.log(`📝 Descrição: ${profile.description}`);
        console.log(`👤 Gênero: ${profile.gender}`);
        console.log(`🎵 Tom: ${profile.tone}`);
        console.log(`🎨 Estilo: ${profile.style}`);
        console.log(`🎯 Ideal para: ${profile.ideal_for}\n`);
        
        return recommendedVoice;
    }

    // === TESTAR UMA VOZ ESPECÍFICA ===
    async testSingleVoice(voiceName, customText = null) {
        const voices = GeminiTTSPremium.VOICE_PROFILES;
        
        if (!voices[voiceName]) {
            console.error(`❌ Voz '${voiceName}' não encontrada!`);
            console.log('\nVozes disponíveis:', Object.keys(voices).join(', '));
            return null;
        }
        
        const profile = voices[voiceName];
        const textToUse = customText || this.testScript;
        
        console.log(`🎙️ Testando voz: ${voiceName}`);
        console.log(`📝 ${profile.description} (${profile.gender}, ${profile.tone})`);
        console.log(`💬 Texto: "${textToUse.substring(0, 100)}..."\n`);
        
        try {
            const tts = new GeminiTTSPremium({
                voice: voiceName,
                chunkSize: 400 // Menor para teste
            });
            
            const result = await tts.generateFromScript(textToUse, null, this.outputDir);
            
            console.log(`✅ Áudio gerado com sucesso!`);
            console.log(`📁 Arquivo: ${result.localPath}`);
            console.log(`⏱️ Duração: ${result.duration.toFixed(1)}s`);
            console.log(`📊 Chunks processados: ${result.chunks}\n`);
            
            return result;
            
        } catch (error) {
            console.error(`❌ Erro ao testar voz ${voiceName}:`, error.message);
            return null;
        }
    }

    // === COMPARAR MÚLTIPLAS VOZES ===
    async compareVoices(voiceList, customText = null) {
        console.log(`🔄 Comparando ${voiceList.length} vozes...\n`);
        
        const results = [];
        const textToUse = customText || this.testScript;
        
        for (const voiceName of voiceList) {
            console.log(`\n--- TESTANDO: ${voiceName} ---`);
            const result = await this.testSingleVoice(voiceName, textToUse);
            
            if (result) {
                results.push({
                    voice: voiceName,
                    profile: GeminiTTSPremium.VOICE_PROFILES[voiceName],
                    duration: result.duration,
                    file: result.localPath,
                    success: true
                });
            } else {
                results.push({
                    voice: voiceName,
                    success: false
                });
            }
            
            // Delay entre testes
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Resumo dos resultados
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMO DA COMPARAÇÃO:');
        console.log('='.repeat(60));
        
        results.forEach((result, index) => {
            if (result.success) {
                console.log(`\n${index + 1}. 🎙️ ${result.voice}`);
                console.log(`   📝 ${result.profile.description}`);
                console.log(`   ⏱️ Duração: ${result.duration.toFixed(1)}s`);
                console.log(`   📁 ${path.basename(result.file)}`);
            } else {
                console.log(`\n${index + 1}. ❌ ${result.voice} - FALHA`);
            }
        });
        
        const successCount = results.filter(r => r.success).length;
        console.log(`\n🏆 Sucessos: ${successCount}/${results.length}`);
        console.log(`📁 Arquivos salvos em: ${this.outputDir}\n`);
        
        return results;
    }

    // === ENCONTRAR MELHOR VOZ POR CRITÉRIO ===
    findBestVoiceFor(criteria) {
        const voices = GeminiTTSPremium.VOICE_PROFILES;
        const matches = [];
        
        Object.entries(voices).forEach(([name, profile]) => {
            let score = 0;
            
            // Pontuar baseado nos critérios
            if (criteria.gender && profile.gender === criteria.gender) score += 3;
            if (criteria.tone && profile.tone === criteria.tone) score += 3;
            if (criteria.style && profile.style === criteria.style) score += 2;
            if (criteria.ideal_for && profile.ideal_for === criteria.ideal_for) score += 4;
            
            // Busca parcial em descrição
            if (criteria.keywords) {
                criteria.keywords.forEach(keyword => {
                    if (profile.description.toLowerCase().includes(keyword.toLowerCase())) {
                        score += 1;
                    }
                });
            }
            
            if (score > 0) {
                matches.push({ name, profile, score });
            }
        });
        
        // Ordenar por score (maior primeiro)
        matches.sort((a, b) => b.score - a.score);
        
        console.log(`🔍 MELHORES VOZES PARA OS CRITÉRIOS: ${JSON.stringify(criteria)}\n`);
        
        matches.slice(0, 5).forEach((match, index) => {
            console.log(`${index + 1}. 🎙️ ${match.name} (Score: ${match.score})`);
            console.log(`   📝 ${match.profile.description}`);
            console.log(`   🎯 ${match.profile.ideal_for}\n`);
        });
        
        return matches.length > 0 ? matches[0] : null;
    }

    // === CONFIGURAR VOZ NO AMBIENTE ===
    setEnvironmentVoice(voiceName, secondary = null) {
        const envFile = path.join(__dirname, '.env');
        let envContent = '';
        
        try {
            if (fs.existsSync(envFile)) {
                envContent = fs.readFileSync(envFile, 'utf8');
            }
        } catch (error) {
            console.warn('Não foi possível ler arquivo .env');
        }
        
        // Remover configurações antigas de voz
        envContent = envContent.replace(/^TTS_VOICE_PRIMARY=.*$/m, '');
        envContent = envContent.replace(/^TTS_VOICE_SECONDARY=.*$/m, '');
        envContent = envContent.replace(/^TTS_AUTO_SELECT=.*$/m, '');
        
        // Adicionar novas configurações
        envContent += `\n# === CONFIGURAÇÃO TTS GEMINI PREMIUM ===\n`;
        envContent += `TTS_VOICE_PRIMARY=${voiceName}\n`;
        if (secondary) {
            envContent += `TTS_VOICE_SECONDARY=${secondary}\n`;
        }
        envContent += `TTS_AUTO_SELECT=true\n`;
        
        try {
            fs.writeFileSync(envFile, envContent);
            console.log(`✅ Voz configurada no ambiente:`);
            console.log(`   🎙️ Primária: ${voiceName}`);
            if (secondary) console.log(`   🎙️ Secundária: ${secondary}`);
            console.log(`   📁 Arquivo: ${envFile}\n`);
        } catch (error) {
            console.error('❌ Erro ao salvar configuração:', error.message);
        }
    }
}

// === EXECUÇÃO CLI ===
if (require.main === module) {
    const args = process.argv.slice(2);
    const selector = new VoiceSelector();
    
    // Processar argumentos
    const command = args[0];
    
    (async () => {
        switch (command) {
            case 'list':
            case 'ls':
                selector.listAllVoices();
                break;
                
            case 'recommend':
            case 'rec':
                const contentType = args[1] || 'misterios-brasileiros';
                selector.recommendVoice(contentType);
                break;
                
            case 'test':
                const voiceName = args[1];
                const customText = args[2];
                if (!voiceName) {
                    console.error('❌ Use: node voice-selector.js test <VOICE_NAME> [TEXT]');
                    process.exit(1);
                }
                await selector.testSingleVoice(voiceName, customText);
                break;
                
            case 'compare':
            case 'comp':
                const voices = args.slice(1).filter(v => !v.startsWith('--'));
                const text = args.find(arg => arg.startsWith('--text='))?.split('=')[1];
                
                if (voices.length === 0) {
                    // Comparar top 5 recomendadas para mistérios
                    const defaultVoices = ['Kore', 'Zephyr', 'Gacrux', 'Charon', 'Orus'];
                    await selector.compareVoices(defaultVoices, text);
                } else {
                    await selector.compareVoices(voices, text);
                }
                break;
                
            case 'find':
                const criteria = {};
                args.slice(1).forEach(arg => {
                    if (arg.startsWith('--gender=')) criteria.gender = arg.split('=')[1];
                    if (arg.startsWith('--tone=')) criteria.tone = arg.split('=')[1];
                    if (arg.startsWith('--for=')) criteria.ideal_for = arg.split('=')[1];
                    if (arg.startsWith('--keywords=')) criteria.keywords = arg.split('=')[1].split(',');
                });
                selector.findBestVoiceFor(criteria);
                break;
                
            case 'set':
                const primaryVoice = args[1];
                const secondaryVoice = args[2];
                if (!primaryVoice) {
                    console.error('❌ Use: node voice-selector.js set <PRIMARY_VOICE> [SECONDARY_VOICE]');
                    process.exit(1);
                }
                selector.setEnvironmentVoice(primaryVoice, secondaryVoice);
                break;
                
            case 'help':
            case '--help':
            case '-h':
            default:
                console.log('🎙️ VOICE SELECTOR - Utilitário de Vozes Gemini TTS\n');
                console.log('COMANDOS DISPONÍVEIS:');
                console.log('  list                     - Listar todas as vozes');
                console.log('  recommend [TIPO]         - Recomendar voz por tipo de conteúdo');
                console.log('  test VOICE [TEXT]        - Testar uma voz específica');
                console.log('  compare [VOICE1 VOICE2]  - Comparar vozes');
                console.log('  find --criteria          - Encontrar vozes por critérios');
                console.log('  set VOICE [VOICE2]       - Configurar voz no ambiente');
                console.log('');
                console.log('EXEMPLOS:');
                console.log('  node voice-selector.js list');
                console.log('  node voice-selector.js recommend misterios-brasileiros');
                console.log('  node voice-selector.js test Kore "Texto de teste"');
                console.log('  node voice-selector.js compare Kore Zephyr Gacrux');
                console.log('  node voice-selector.js find --gender=masculina --tone=firme');
                console.log('  node voice-selector.js set Kore Zephyr');
                console.log('');
                break;
        }
    })().catch(error => {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    });
}

module.exports = VoiceSelector;