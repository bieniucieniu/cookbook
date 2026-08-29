{ pkgs, ... }:

{
  packages = [
    pkgs.git
    pkgs.kotlin
    pkgs.kotlin-language-server
  ];

  languages.java = {
    enable = true;
    jdk.package = pkgs.jdk25;
    gradle = {
      enable = true;
      package = pkgs.gradle_9.override { java = pkgs.jdk25; };
    };
    lsp.enable = false;
  };

  languages.javascript = {
    enable = true;
    package = pkgs.nodejs-slim_22;
    pnpm = {
      enable = true;
      package = pkgs.pnpm_11;
      install.enable = true;
    };
  };

  enterShell = ''
    echo "java $(java -version 2>&1 | head -n 1)"
    echo "gradle $(gradle --version | awk '/^Gradle /{print $2; exit}')"
    echo "node $(node --version)"
    echo "pnpm $(pnpm --version)"
  '';

  enterTest = ''
    java -version
    gradle --version
    node --version
    pnpm --version
    gradle --version | grep -q 'Gradle 9'
    pnpm --version | grep -q '^11\.'
  '';
}
