# Pipeline de Automação de Vídeos - Versão GCP-Free

## 🆆 **SEM DEPENDÊNCIAS DO GOOGLE CLOUD PLATFORM**

Esta é uma versão completamente refatorada do pipeline de automação de vídeos que **elimina todas as dependências do Google Cloud Platform**, utilizando apenas serviços gratuitos e ferramentas locais.

## 🔄 **O Que Mudou**

### ❌ **Removido (GCP Dependente):**
- Google Vertex AI (Imagen) para geração de imagens
- Google Cloud Text-to-Speech para narração
- Google Cloud Storage
- Autenticação via Service Account JSON

### ✅ **Mantido (Não-GCP):**
- Google Gemini API (funciona independentemente)
- Google Drive API (OAuth2)
- Google Sheets API (OAuth2)
- Discord Webhook para notificações

### 🆕 **Novos Serviços Alternativos:**
- **Geração de Imagens:** Pollinations.ai, Craiyon, placeholders locais
- **Text-to-Speech:** Mozilla TTS, gTTS, eSpeak, Festival
- **Processamento de Vídeo:** Editly, FFmpeg direto, FFCreator
- **Armazenamento:** Local + backup opcional (Supabase, Cloudflare R2, Backblaze B2)

## 🚀 **Instalação Rápida**

### 1. Clone e Configure
```bash
cd novo/

# Execute o script de instalação
chmod +x setup-gcp-free.sh
./setup-gcp-free.sh
```

### 2. Configuração Manual (Se Preferência)

#### Instalar Dependências do Sistema
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y ffmpeg python3 python3-pip espeak espeak-data imagemagick

# CentOS/RHEL
sudo yum install -y epel-release
sudo yum install -y ffmpeg python3 python3-pip espeak ImageMagick

# macOS
brew install ffmpeg python3 espeak imagemagick
```

#### Instalar Bibliotecas Python
```bash
pip3 install TTS gTTS pyttsx3 Pillow
```

#### Instalar Dependências Node.js
```bash
cp package-gcp-free.json package.json
npm install
npm install editly fluent-ffmpeg sharp --save-optional
```

### 3. Configurar Ambiente
```bash
# Copiar configuração
cp .env.gcp-free .env

# Editar com suas chaves
nano .env
```

### 4. Testar e Executar
```bash
# Teste rápido
node quick-test.js

# Executar pipeline
node pipeline-gcp-free.js
```

## ⚙️ **Configuração Mínima**

Apenas **1 variável obrigatória** no arquivo `.env`:

```bash
# Única dependência obrigatória
GEMINI_API_KEY=sua_chave_gemini_aqui

# Opcional: Para tracking em planilhas
GOOGLE_DRIVE_REFRESH_TOKEN=seu_token_oauth2
GOOGLE_SHEET_ID=id_da_planilha

# Opcional: Para notificações
DISCORD_WEBHOOK_URL=webhook_discord
```

## 🛠️ **Arquitetura dos Serviços Alternativos**

### Geração de Imagens (Failover Automático)
1. **Pollinations.ai** (gratuito, unlimited)
2. **Craiyon** (ex-DALL-E mini, gratuito)
3. **Placeholder local** (ImageMagick/Canvas)

### Text-to-Speech (Prioridade de Qualidade)
1. **Mozilla TTS** (neural, alta qualidade)
2. **gTTS** (Google online, gratuito)
3. **eSpeak** (local, rápido)
4. **Festival** (local, alternativo)
5. **Áudio silencioso** (fallback final)

### Processamento de Vídeo (Flexibilidade)
1. **Editly** (framework declarativo)
2. **FFmpeg direto** (comando)
3. **FFCreator** (biblioteca avançada)
4. **Vídeo simples** (imagem + áudio)

### Armazenamento (Híbrido)
- **Local:** `./storage/` (unlimited)
- **Backup opcional:** Supabase (1GB), Cloudflare R2 (10GB), Backblaze B2 (10GB)

## 📊 **Comparação: Original vs GCP-Free**

| Recurso | Versão Original | Versão GCP-Free |
|---------|------------------|------------------|
| **Custo** | $$$$ (GCP pago após trial) | 🆆 **100% Gratuito** |
| **Dependências** | GCP Account + Service Keys | Apenas Gemini API |
| **Imagens** | Vertex AI Imagen | Pollinations + Craiyon |
| **TTS** | Google Cloud TTS | Mozilla TTS + gTTS |
| **Vídeo** | FFmpeg (GCP) | Editly + FFmpeg local |
| **Storage** | Google Cloud Storage | Local + backup opcional |
| **Setup** | Complexo (JSON keys) | Simples (1 API key) |
| **Offline** | ❌ Não | ✅ Parcialmente |
| **Escalabilidade** | Alta (cloud) | Média (local) |
| **Qualidade** | Premium | Muito boa |

## 🧰 **Testes e Validação**

```bash
# Teste rápido (2 minutos)
node quick-test.js

# Resultado esperado:
# 🎉 RESUMO DO TESTE:
# {
#   "ready": true,
#   "status": "PRONTO PARA USAR",
#   "optionalServicesAvailable": {
#     "imageGeneration": true,
#     "tts": true,
#     "videoProcessing": true
#   }
# }
```

## 📄 **GitLab CI/CD**

O pipeline inclui configuração completa para GitLab CI/CD:

- **Setup automático:** instala todas as dependências
- **Testes:** valida serviços alternativos
- **Execução:** pipeline completo automatizado
- **Notificações:** Discord integration

```yaml
# .gitlab-ci.yml já configurado!
# Apenas adicione as variáveis no GitLab:
# GEMINI_API_KEY
# DISCORD_WEBHOOK_URL (opcional)
```

## 📞 **Suporte e Solução de Problemas**

### Problemas Comuns:

**1. FFmpeg não encontrado**
```bash
# Ubuntu
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg
```

**2. Python TTS libraries falham**
```bash
pip3 install --upgrade TTS gTTS
```

**3. Geração de imagem falha**
> ✅ **Automático:** O sistema automaticamente usa placeholders se serviços online falharem

**4. Node.js modules missing**
```bash
npm install
npm install editly fluent-ffmpeg --save
```

### Debug Mode:
```bash
# Habilitar logs detalhados
echo "VERBOSE_LOGGING=true" >> .env
node pipeline-gcp-free.js
```

## 🎆 **Vantagens da Migração**

1. **💰 Custo Zero:** Sem mensalidades ou créditos GCP
2. **🛠️ Setup Simples:** 1 API key vs 3 service accounts
3. **🔒 Sem Bloqueios:** Nunca perder acesso por billing
4. **🌍 Open Source:** Todas as alternativas são abertas
5. **💻 Local-First:** Funciona offline para a maioria das funções
6. **⚙️ Flexibilidade:** Múltiplos services com fallback
7. **📈 Escalabilidade:** GitLab CI/CD integrado

## 📚 **Documentação Adicional**

- **[Configuração Avançada](./docs/advanced-config.md)**
- **[API dos Módulos](./docs/modules-api.md)**
- **[Deploy com GitLab](./docs/gitlab-deploy.md)**
- **[Backup na Nuvem](./docs/cloud-backup.md)**

---

**🎉 Aproveite seu pipeline de vídeos totalmente gratuito e sem limites!**