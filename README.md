# Pipeline de Automação de Vídeos com IA

Este projeto utiliza Node.js e APIs do Google (Gemini e Imagen) para automatizar a criação de conteúdo para vídeos do YouTube. O pipeline gera um tópico de vídeo, cria um roteiro, gera imagens e, finalmente, faz o upload do roteiro para o Google Drive.

---

## 1. Configuração do Projeto

Antes de executar o projeto, você precisa configurar suas credenciais em um arquivo `.env` na raiz do projeto.

1.  **Crie o arquivo `.env`** (se ainda não existir):

    ```bash
    touch .env
    ```

2.  **Adicione as seguintes variáveis de ambiente ao arquivo `.env`:**

    ```
    # Chave de API para o Google Gemini
    GEMINI_API_KEY="SUA_CHAVE_API_DO_GEMINI_AQUI"

    # Refresh Token para autenticação com a API do Google Drive
    # Este token foi gerado através do fluxo OAuth 2.0
    GOOGLE_DRIVE_REFRESH_TOKEN="SEU_REFRESH_TOKEN_DO_GOOGLE_DRIVE_AQUI"
    ```

    **Importante:** O arquivo `.gitignore` já está configurado para ignorar o `.env`, garantindo que suas chaves secretas não sejam enviadas para o controle de versão.

---

## 2. Instalação das Dependências

Para instalar as bibliotecas Node.js necessárias para este projeto, execute o seguinte comando no terminal:

```bash
npm install
```

---

## 3. Execução do Pipeline

Com o ambiente configurado e as dependências instaladas, você pode executar o pipeline completo com um único comando:

```bash
node novo/pipeline.js
```

### O que o Pipeline Faz?

1.  **Etapa 1: Descoberta de Conteúdo:** Usa a API do Gemini para gerar um tópico de vídeo interessante sobre mistérios brasileiros.
2.  **Etapa 2: Geração de Roteiro:** Cria um roteiro detalhado para o tópico e o salva em `novo/output/roteiro.txt`.
3.  **Etapa 3: Criação de Prompts de Imagem:** Analisa o roteiro e gera 5 prompts de imagem em estilo cinematográfico.
4.  **Etapa 4: Geração de Imagens:** Usa a API Vertex AI (Imagen) para criar imagens com base nos prompts. As imagens são salvas em `novo/output/images/`.
5.  **Etapa 7: Upload para o Google Drive:** Faz o upload do arquivo `roteiro.txt` para a sua conta do Google Drive.

As etapas de **Geração de Narração** e **Montagem de Vídeo** estão marcadas como `TODO` no código para desenvolvimento futuro.

---

## 4. Ambiente de Desenvolvimento (IDX)

Este projeto é configurado para ser executado em um ambiente de desenvolvimento IDX. As ferramentas de sistema (como a versão do Node.js) e as extensões do editor são definidas declarativamente no arquivo `.idx/dev.nix`.

Se você precisar adicionar novas ferramentas ou extensões ao ambiente, modifique o arquivo `.idx/dev.nix` para manter o ambiente de desenvolvimento consistente e reproduzível.
