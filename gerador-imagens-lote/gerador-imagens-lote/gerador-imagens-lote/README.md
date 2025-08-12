# Whisk Automation Loop

Extensão para Google Chrome que automatiza a geração e download de imagens em lato no Google Whisk.

## Funcionalidades

- Insere automaticamente uma lista de prompts no Whisk
- Gera imagens para cada prompt
- Faz o download automático das imagens geradas
- Exibe o progresso em tempo real
- Interface simples e intuitiva

## Instalação

1. Baixe ou clone este repositório para o seu computador
2. Abra o Google Chrome e acesse `chrome://extensions/`
3. Ative o "Modo do desenvolvedor" no canto superior direito
4. Clique em "Carregar sem compactação"
5. Selecione a pasta onde você baixou a extensão

## Como usar

1. Navegue até [Google Whisk](https://labs.google/fx/pt/tools/whisk)
2. Clique no ícone da extensão na barra de ferramentas do Chrome
3. Cole seus prompts na caixa de texto (um por linha)
4. Clique em "Iniciar Loop no Whisk"
5. Acompanhe o progresso na janela popup
6. As imagens serão salvas na pasta de downloads do Chrome em uma subpasta chamada "whisk_downloads"

## Requisitos

- Google Chrome 88 ou superior
- Acesso ao Google Whisk (labs.google/fx/pt/tools/whisk)

## Solução de Problemas

- **Extensão não aparece na barra de ferramentas**: Recarregue a página do Whisk e tente novamente
- **Erro ao encontrar elementos**: Certifique-se de que você está na página correta do Whisk
- **Download não inicia**: Verifique as permissões de download do Chrome

## Limitações

- A extensão pode não funcionar corretamente se a interface do Whisk for atualizada
- O tempo de geração de imagens pode variar dependendo da carga do servidor

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

## Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo LICENSE para mais detalhes.
