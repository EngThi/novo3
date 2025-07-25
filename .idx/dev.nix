{ pkgs, ... }: {
  packages = [
    pkgs.nodejs_20,
    pkgs.ffmpeg,
    pkgs.git-filter-repo # Ferramenta para limpar o histórico do Git
  ];
  env = {
    GEMINI_API_KEY = "AIzaSyAprFKW20ySLRVt7_ZlSkb_2UcVfOZ1rzk";
    # GOOGLE_APPLICATION_CREDENTIALS = "./.idx/google-service-account-key.json";
    # Removendo a variável de ambiente do projeto Google Cloud, pois a autenticação agora é explícita
    # GOOGLE_CLOUD_PROJECT = "drive-uploader-466418";
  };
  idx = {
    extensions = [
      "dbaeumer.vscode-eslint"
    ];
    workspace = {
      onCreate = {
        npm-install = "npm install --prefix novo",
        # Copia o arquivo de credencial na criação do workspace, mas não o rastreia com o Git
        copy-creds = "cp .idx/google-service-account-key.json novo/google-drive-credentials.json"
      };
      onStart = {
        run-pipeline = "node novo/pipeline.js";
      };
    };
  };
}
