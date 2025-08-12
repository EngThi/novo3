{ pkgs, ... }:

{
  channel = "stable-24.05";

  packages = [
    pkgs.nodejs_20
    pkgs.ffmpeg

    # --- DEPENDÊNCIAS COMPLETAS PARA PUPPETEER ---
    pkgs.chromium
    pkgs.nss
    pkgs.nspr
    pkgs.cups
    pkgs.dbus
    pkgs.expat
    pkgs.glib
    pkgs.gtk3
    pkgs.pango
    pkgs.cairo
    pkgs.gsettings-desktop-schemas
    pkgs.at-spi2-atk
    pkgs.libxkbcommon
    pkgs.libglvnd
    pkgs.mesa
    pkgs.systemd
    pkgs.alsa-lib

    # Pacotes Xorg necessários
    pkgs.xorg.libX11
    pkgs.xorg.libXcomposite
    pkgs.xorg.libXcursor
    pkgs.xorg.libXdamage
    pkgs.xorg.libXext
    pkgs.xorg.libXfixes
    pkgs.xorg.libXi
    pkgs.xorg.libXrandr
    pkgs.xorg.libXrender
    pkgs.xorg.libXScrnSaver
    pkgs.xorg.libXtst
    pkgs.xorg.libxcb
    
    # --- SOLUÇÃO DEFINITIVA: Servidor de Tela Virtual ---
    pkgs.xorg.xorgserver # Fornece o Xvfb
  ];

  env = {};
  idx.extensions = [];
  idx.workspace = {};
}
