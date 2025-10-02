# 🎬 Pipeline Ultimate V6.3 - Sistema Completo de Geração Automatizada de Vídeos com IA

[![Version](https://img.shields.io/badge/version-6.3-blue.svg)](https://github.com/EngThi/novo3)
[![Status](https://img.shields.io/badge/status-production%20ready-green.svg)](https://github.com/EngThi/novo3)
[![License](https://img.shields.io/badge/license-MIT-orange.svg)](LICENSE)
[![Quality](https://img.shields.io/badge/quality-premium-gold.svg)](https://github.com/EngThi/novo3)

> **O sistema mais avançado de geração automatizada de vídeos com Inteligência Artificial do mercado**

## 🌟 Visão Geral

O **Pipeline Ultimate V6.3** é um sistema revolucionário que transforma qualquer tópico em vídeos profissionais completos de forma totalmente automatizada. Utilizando as IAs mais avançadas disponíveis, o sistema gera:

- 🧠 **Roteiros inteligentes** com Gemini 2.5 Flash
- 🎨 **Imagens premium** com SDXL + Multi-Provider
- 🎙️ **Narração profissional** com Gemini TTS Premium (30 vozes)
- 🎬 **Montagem HD** com FFmpeg sincronizado

### ⚡ Principais Características

| Característica | Descrição |
|----------------|-----------|
| 🚀 **Automação Completa** | Do tópico ao vídeo final em minutos |
| 💎 **Qualidade Premium** | SDXL + Gemini TTS + HD Assembly |
| 🔄 **Sistema Robusto** | 4 provedores com fallback automático |
| 🎯 **Zero Placeholders** | Apenas conteúdo real, nunca genérico |
| 📊 **Escalabilidade** | Suporta múltiplas chaves API |
| 🛡️ **Confiabilidade** | Retry inteligente e recuperação automática |

---

## 🎯 Funcionalidades Principais

### 🧠 Geração de Scripts Inteligente
- **Gemini 2.5 Flash**: IA mais avançada para criação de conteúdo
- **Contexto atual**: Incluí data e informações relevantes
- **SEO otimizado**: Títulos e descrições para máximo alcance
- **Estrutura profissional**: Abertura, desenvolvimento e conclusão

### 🎨 Sistema de Imagens Multi-Provider Premium
- **SDXL Premium**: Stable Diffusion XL para máxima qualidade
- **Nano Banana**: Gemini 2.5 Flash Image Preview
- **Pollinations**: Geração rápida e confiável
- **Hugging Face**: FLUX como backup
- **Retry inteligente**: Até 12 tentativas por imagem
- **Zero placeholders**: Sistema falha se não conseguir imagens reais

### 🎙️ Narração TTS Premium
- **Gemini TTS Premium**: 30 vozes profissionais disponíveis
- **Qualidade cinematográfica**: WAV 24kHz, divisão inteligente
- **Vozes especializadas**:
  - `Kore`: Ideal para notícias e conteúdo sério
  - `Zephyr`: Versátil para todos os tipos
  - `Charon`: Perfeita para tutoriais
  - `Puck`: Animada para conteúdo jovem
- **Sistema robusto**: Rotação automática de chaves API
- **Fallback**: Espeak como backup de emergência

### 🎬 Montagem de Vídeo Avançada
- **Qualidade HD**: 1280x720 nativo
- **Sincronização perfeita**: Baseada na duração real do áudio
- **Transições profissionais**: Fade in/out automático
- **Otimização**: CRF 20, AAC 192k para streaming
- **Compatibilidade**: MP4 universal

---

## 🚀 Instalação e Configuração

### Pré-requisitos
- Node.js 18+ 
- FFmpeg instalado
- Chaves API configuradas

### 1. Clone o repositório
```
git clone https://github.com/EngThi/novo3.git
cd novo3/novo
```

### 2. Instale dependências
```
npm install
```

### 3. Configure as chaves API
```
cp .env.example .env
# Edite .env com suas chaves
```

#### 🔑 Chaves necessárias no `.env`:
```
# === GEMINI APIs (OBRIGATÓRIO) ===
GEMINI_API_KEY=sua_chave_principal_aqui
GEMINI_API_KEY_2=sua_chave_backup_2
GEMINI_API_KEY_3=sua_chave_backup_3

# === HUGGING FACE (RECOMENDADO para SDXL) ===
HF_TOKEN=hf_sua_chave_huggingface

# === OPCIONAIS ===
TOGETHER_API_KEY=sua_chave_together
HUGGINGFACE_TOKEN=seu_token_hf_alternativo

# === CONFIGURAÇÕES ===
TTS_VOICE_PRIMARY=Kore
OUTPUT_QUALITY=premium
MAX_RETRIES=3
```

### 4. Teste a instalação
```
node pipeline-ultimate-robust.js "Teste de instalação"
```

---

## 💻 Como Usar

### 🎯 Uso Básico
```
# Geração completa (SDXL Premium)
node pipeline-ultimate-robust.js "Principais tendências em IA para 2025"

# Geração otimizada (mais rápida)
node pipeline-ultimate-optimized.js "Análise do mercado cripto hoje"

# Dashboard web
node launch-ultimate-auto-port.js
```

### 🔧 Uso Avançado

#### Personalizar voz da narração:
```
// Edite o arquivo pipeline e altere:
voz: 'Zephyr'  // Para: 'Kore', 'Charon', 'Puck', etc.
```

#### Configurar qualidade de imagem:
```
// No SDXL working:
width: 1280,    // Resolução personalizada
height: 720,
steps: 30       // Mais steps = melhor qualidade
```

---

## 🏗️ Arquitetura do Sistema

```
Pipeline Ultimate V6.3
├── 🧠 Script Generation
│   ├── Gemini 2.5 Flash (Primary)
│   ├── Key Rotation System
│   └── Fallback Generation
│
├── 🎨 Image Generation (Multi-Provider)
│   ├── 1️⃣ Nano Banana (Gemini Premium)
│   ├── 2️⃣ SDXL Premium (Hugging Face)
│   ├── 3️⃣ Pollinations (Fast & Reliable)
│   └── 4️⃣ Hugging Face FLUX (Backup)
│
├── 🎙️ TTS Premium
│   ├── Gemini TTS (30 voices)
│   ├── Intelligent Block Splitting
│   ├── Auto Audio Merging
│   └── Espeak Fallback
│
└── �� HD Video Assembly
    ├── FFmpeg Professional
    ├── Audio Sync Engine
    ├── Transition Effects
    └── Streaming Optimization
```

### 📊 Fluxo de Processamento

1. **Input** → Tópico fornecido pelo usuário
2. **Script** → Gemini 2.5 Flash gera roteiro profissional
3. **Images** → Sistema tenta provedores em ordem de prioridade
4. **Audio** → Gemini TTS converte script em narração premium
5. **Assembly** → FFmpeg combina tudo em vídeo HD sincronizado
6. **Output** → Vídeo final pronto para publicação

---

## 🎨 Provedores de IA Suportados

### 🖼️ Geração de Imagens

| Provedor | Qualidade | Velocidade | Custo | Status |
|----------|-----------|------------|-------|---------|
| 🍌 **Nano Banana** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Gemini | Premium |
| 🎨 **SDXL Premium** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | HF Token | Premium |
| 🌸 **Pollinations** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Grátis | Confiável |
| 🤗 **Hugging Face** | ⭐⭐⭐⭐ | ⭐⭐⭐ | Grátis/Token | Backup |

### 🎙️ Síntese de Voz

| Voz | Característica | Uso Recomendado |
|-----|---------------|-----------------|
| **Kore** | Firme, autoritativa | Notícias, conteúdo sério |
| **Zephyr** | Clara, versátil | Uso geral, tutoriais |
| **Charon** | Informativa, didática | Educacional, explicativo |
| **Puck** | Animada, energética | Conteúdo jovem, entretenimento |
| **Fenrir** | Excitada, dinâmica | Marketing, vendas |

---

## ⚙️ Configurações Avançadas

### 🎯 Otimização de Performance

#### Para máxima qualidade:
```
// pipeline-ultimate-robust.js
const CONFIG = {
    imageProvider: 'sdxl-premium',
    ttsVoice: 'Kore',
    videoQuality: 'premium',
    retryAttempts: 5
};
```

#### Para máxima velocidade:
```
// pipeline-ultimate-optimized.js
const CONFIG = {
    imageProvider: 'pollinations',
    ttsVoice: 'Zephyr',
    videoQuality: 'optimized',
    maxWordsPerBlock: 400
};
```

### 🔧 Personalização de Saída

#### Diretórios de output:
```
outputs/
├── videos/    # Vídeos finais MP4
├── audio/     # Narrações WAV
└── images/    # Imagens geradas PNG
```

#### Formatos suportados:
- **Vídeo**: MP4 (H.264 + AAC)
- **Áudio**: WAV (24kHz, mono/stereo)
- **Imagens**: PNG (1280x720 padrão)

---

## 🛠️ Troubleshooting

### ❌ Problemas Comuns

#### "Quota exceeded" no Gemini:
```
# Adicione mais chaves no .env:
GEMINI_API_KEY_4=nova_chave_aqui
GEMINI_API_KEY_5=outra_chave_aqui
```

#### SDXL não funciona:
```
# Verifique token HF:
echo $HF_TOKEN
# Deve começar com "hf_" e ter ~37 caracteres
```

#### Erro de FFmpeg:
```
# Instale FFmpeg:
sudo apt update && sudo apt install ffmpeg
# Ou no macOS: brew install ffmpeg
```

#### Áudio sem som:
```
# Verifique dependências TTS:
npm install firebase-admin
# Teste isolado:
node -e "console.log(process.env.GEMINI_API_KEY)"
```

### 🔍 Debug Mode

```
# Ativar logs detalhados:
DEBUG=true node pipeline-ultimate-robust.js "teste debug"

# Testar componentes isoladamente:
node services/ai/sdxl-working.js  # Teste SDXL
node services/audio/gemini-tts-premium.js  # Teste TTS
```

---

## 📊 Exemplos de Resultados

### 🎬 Vídeo Típico Gerado:
- **Duração**: 30-180 segundos
- **Qualidade**: HD 1280x720
- **Tamanho**: 2-8 MB
- **Formato**: MP4 otimizado para web

### 📈 Performance Típica:
- **Script**: 5-15 segundos
- **Imagens**: 30-120 segundos (6 imagens)
- **TTS**: 15-60 segundos
- **Montagem**: 10-30 segundos
- **Total**: 2-4 minutos end-to-end

### 💎 Qualidade Garantida:
- ✅ 0% placeholders (só conteúdo real)
- ✅ Sincronização perfeita áudio/vídeo
- ✅ Transições profissionais
- ✅ Qualidade de streaming

---

## 🚀 Roadmap e Atualizações

### ✅ V6.3 (Atual)
- SDXL Premium integrado
- Gemini TTS com 30 vozes
- Sistema robusto zero placeholders
- Multi-provider com retry inteligente

### 🔜 Próximas Versões
- **V6.4**: Integração com YouTube API
- **V6.5**: Suporte a vídeos longos (5-10 min)
- **V6.6**: Editor de vídeo integrado
- **V6.7**: Múltiplas linguagens

---

## 🤝 Contribuição

### Como contribuir:
1. Fork o repositório
2. Crie uma branch para sua feature
3. Faça commit das mudanças
4. Envie um Pull Request

### 🐛 Reportar Bugs:
- Use as Issues do GitHub
- Inclua logs detalhados
- Descreva passos para reproduzir

### 💡 Sugestões:
- Abra uma Issue com label "enhancement"
- Descreva o caso de uso
- Proponha implementação se possível

---

## 📄 Licença

Este projeto está licenciado sob a MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 🙏 Agradecimentos

- **Google Gemini**: Pelas APIs de IA revolucionárias
- **Stability AI**: Pelo SDXL excepcional
- **Hugging Face**: Pela infraestrutura de IA
- **Pollinations**: Pela geração rápida e confiável
- **FFmpeg**: Pelo processamento de vídeo profissional

---

## 📞 Suporte

### 📧 Contato:
- **GitHub**: [@EngThi](https://github.com/EngThi)
- **Issues**: [Reportar Problema](https://github.com/EngThi/novo3/issues)

### 📚 Documentação:
- **Wiki**: [Wiki Completa](https://github.com/EngThi/novo3/wiki)
- **API Docs**: [Documentação da API](docs/api.md)
- **Exemplos**: [Pasta de Exemplos](examples/)

---

## 🏆 Stats do Projeto

![Stats](https://github-readme-stats.vercel.app/api?username=EngThi&repo=novo3&show_icons=true&theme=dark)

### 📊 Métricas:
- 🔧 **Arquivos Core**: 7
- 📝 **Linhas de Código**: ~5.000
- 🎨 **Provedores IA**: 4
- 🎙️ **Vozes TTS**: 30
- ⭐ **Qualidade**: Premium

---

<div align="center">

### 🚀 Pipeline Ultimate V6.3
**O futuro da geração automatizada de vídeos está aqui!**

[![Made with ❤️](https://img.shields.io/badge/Made%20with-❤️-red.svg)](https://github.com/EngThi/novo3)
[![Powered by AI](https://img.shields.io/badge/Powered%20by-AI-blue.svg)](https://github.com/EngThi/novo3)

</div>
