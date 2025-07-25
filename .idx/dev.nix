{ pkgs, ... }: {
  packages = [
    pkgs.nodejs_20
    pkgs.ffmpeg # Adicionado ffmpeg aqui
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
        npm-install = "npm install --prefix novo";
      };
      onStart = {
        run-pipeline = "node novo/pipeline.js";
      };
    };
  };
}