{ pkgs, ... }: {
  # Pacotes para instalar no ambiente (sem vírgulas na lista)
  packages = [
    pkgs.nodejs_20
    pkgs.ffmpeg
    pkgs.git-filter-repo
  ];

  # Variáveis de ambiente
  env = {
    GEMINI_API_KEY = "AIzaSyAprFKW20ySLRVt7_ZlSkb_2UcVfOZ1rzk";
    GCLOUD_PROJECT = "drive-uploader-466418";
  };

  # Configurações do IDX
  idx = {
    extensions = [
      "dbaeumer.vscode-eslint"
    ];
    workspace = {
      # Comandos executados na criação do workspace
      onCreate = {
        npm-install = "npm install --prefix novo";
        copy-creds = "cp .idx/google-service-account-key.json novo/google-drive-credentials.json";
      };
      # Comando executado na inicialização do workspace
      onStart = {
        run-pipeline = "node novo/pipeline.js";
      };
    };
  };
}
