#!/bin/bash

# ==================================================================
# SCRIPT DE INSTALAÇÃO PARA PIPELINE GCP-FREE
# ==================================================================
# Este script instala todas as dependências necessárias para executar
# o pipeline de automação de vídeos sem depender do Google Cloud Platform

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Iniciando instalação do Pipeline GCP-Free...${NC}"

# Função para detectar o sistema operacional
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt-get &> /dev/null; then
            echo "ubuntu"
        elif command -v yum &> /dev/null; then
            echo "centos"
        else
            echo "linux-unknown"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    else
        echo "unknown"
    fi
}

# Função para instalar ferramentas do sistema
install_system_tools() {
    local os=$(detect_os)
    echo -e "${YELLOW}\n🔧 Instalando ferramentas do sistema (${os})...${NC}"
    
    case $os in
        "ubuntu")
            echo "Atualizando repositórios..."
            sudo apt-get update
            
            echo "Instalando FFmpeg..."
            sudo apt-get install -y ffmpeg
            
            echo "Instalando Python3 e pip..."
            sudo apt-get install -y python3 python3-pip python3-venv
            
            echo "Instalando eSpeak para TTS..."
            sudo apt-get install -y espeak espeak-data
            
            echo "Instalando ImageMagick (opcional)..."
            sudo apt-get install -y imagemagick
            
            echo "Instalando Festival TTS (opcional)..."
            sudo apt-get install -y festival festival-dev
            ;;
            
        "centos")
            echo "Atualizando repositórios..."
            sudo yum update -y
            
            echo "Instalando EPEL..."
            sudo yum install -y epel-release
            
            echo "Instalando FFmpeg..."
            sudo yum install -y ffmpeg ffmpeg-devel
            
            echo "Instalando Python3 e pip..."
            sudo yum install -y python3 python3-pip
            
            echo "Instalando eSpeak para TTS..."
            sudo yum install -y espeak espeak-devel
            
            echo "Instalando ImageMagick (opcional)..."
            sudo yum install -y ImageMagick ImageMagick-devel
            ;;
            
        "macos")
            if ! command -v brew &> /dev/null; then
                echo -e "${RED}Homebrew não encontrado. Instalando...${NC}"
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            
            echo "Instalando FFmpeg..."
            brew install ffmpeg
            
            echo "Instalando Python3..."
            brew install python3
            
            echo "Instalando eSpeak para TTS..."
            brew install espeak
            
            echo "Instalando ImageMagick (opcional)..."
            brew install imagemagick
            
            echo "Instalando Festival TTS (opcional)..."
            brew install festival
            ;;
            
        *)
            echo -e "${RED}Sistema operacional não suportado automaticamente.${NC}"
            echo "Por favor, instale manualmente:"
            echo "- FFmpeg"
            echo "- Python 3.8+"
            echo "- eSpeak (opcional)"
            echo "- ImageMagick (opcional)"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}✅ Ferramentas do sistema instaladas!${NC}"
}

# Função para instalar bibliotecas Python
install_python_libs() {
    echo -e "${YELLOW}\n🐍 Instalando bibliotecas Python...${NC}"
    
    # Criar ambiente virtual (recomendado)
    if [ ! -d "venv" ]; then
        echo "Criando ambiente virtual Python..."
        python3 -m venv venv
    fi
    
    echo "Ativando ambiente virtual..."
    source venv/bin/activate
    
    echo "Atualizando pip..."
    pip install --upgrade pip
    
    echo "Instalando gTTS (Google Text-to-Speech online)..."
    pip install gtts
    
    echo "Instalando Mozilla TTS (alta qualidade)..."
    pip install TTS
    
    echo "Instalando Pillow para processamento de imagem..."
    pip install Pillow
    
    echo "Instalando outras dependências úteis..."
    pip install pyttsx3 numpy requests
    
    echo -e "${GREEN}✅ Bibliotecas Python instaladas!${NC}"
}

# Função para instalar dependências Node.js
install_node_deps() {
    echo -e "${YELLOW}\n🟢 Instalando dependências Node.js...${NC}"
    
    if [ ! -f "package-gcp-free.json" ]; then
        echo -e "${RED}Arquivo package-gcp-free.json não encontrado!${NC}"
        exit 1
    fi
    
    echo "Copiando configuração de dependências..."
    cp package-gcp-free.json package.json
    
    echo "Instalando módulos Node.js..."
    npm install
    
    echo "Instalando dependências opcionais..."
    npm install editly fluent-ffmpeg sharp canvas --save-optional || echo "Alguns módulos opcionais podem ter falhado"
    
    echo -e "${GREEN}✅ Dependências Node.js instaladas!${NC}"
}

# Função para configurar ambiente
setup_environment() {
    echo -e "${YELLOW}\n⚙️ Configurando ambiente...${NC}"
    
    # Copiar configuração de ambiente se não existir
    if [ ! -f ".env" ]; then
        if [ -f ".env.gcp-free" ]; then
            echo "Copiando configuração de ambiente..."
            cp .env.gcp-free .env
            echo -e "${YELLOW}ATENÇÃO: Configure suas chaves API no arquivo .env${NC}"
        else
            echo -e "${RED}Arquivo .env.gcp-free não encontrado!${NC}"
            exit 1
        fi
    else
        echo "Arquivo .env já existe, mantendo configuração atual."
    fi
    
    # Criar diretórios necessários
    mkdir -p output images cache temp storage
    
    echo -e "${GREEN}✅ Ambiente configurado!${NC}"
}

# Função para executar teste
run_quick_test() {
    echo -e "${YELLOW}\n🧪 Executando teste rápido...${NC}"
    
    node quick-test.js
    
    echo -e "${BLUE}\nPara executar o pipeline completo:${NC}"
    echo "node pipeline-gcp-free.js"
}

# Função principal
main() {
    echo -e "${BLUE}===================================================================${NC}"
    echo -e "${BLUE}           INSTALAÇÃO PIPELINE DE VÍDEO GCP-FREE${NC}"
    echo -e "${BLUE}===================================================================${NC}"
    
    # Verificar se está no diretório correto
    if [ ! -f "pipeline-gcp-free.js" ]; then
        echo -e "${RED}Execute este script no diretório novo/ do projeto!${NC}"
        exit 1
    fi
    
    # Menu de instalação
    echo -e "${YELLOW}Selecione o que deseja instalar:${NC}"
    echo "1) Instalação completa (recomendado)"
    echo "2) Apenas ferramentas do sistema"
    echo "3) Apenas bibliotecas Python"
    echo "4) Apenas dependências Node.js"
    echo "5) Apenas configurar ambiente"
    echo "6) Executar teste rápido"
    echo "7) Sair"
    
    read -p "Digite sua opção (1-7): " choice
    
    case $choice in
        1)
            install_system_tools
            install_python_libs
            install_node_deps
            setup_environment
            run_quick_test
            ;;
        2)
            install_system_tools
            ;;
        3)
            install_python_libs
            ;;
        4)
            install_node_deps
            ;;
        5)
            setup_environment
            ;;
        6)
            run_quick_test
            ;;
        7)
            echo "Saindo..."
            exit 0
            ;;
        *)
            echo -e "${RED}Opção inválida!${NC}"
            exit 1
            ;;
    esac
    
    echo -e "\n${GREEN}🎉 Instalação concluída!${NC}"
    echo -e "${BLUE}\nPróximos passos:${NC}"
    echo "1. Configure suas chaves API no arquivo .env"
    echo "2. Execute: node quick-test.js (para testar)"
    echo "3. Execute: node pipeline-gcp-free.js (pipeline completo)"
}

# Executar função principal
main "$@"