{ pkgs, config, ... }:
let
  root = config.devenv.root;
  jdkPackage = pkgs.zulu25;
in
{
  packages = [
    pkgs.git
    pkgs.kotlin
    pkgs.kotlin-language-server
  ];

  languages.java = {
    enable = true;
    jdk.package = jdkPackage;
    gradle = {
      enable = true;
      package = pkgs.gradle_9.override { java = jdkPackage; };
    };
    lsp.enable = false;
  };

  languages.javascript = {
    enable = true;
    package = pkgs.nodejs;
    pnpm = {
      enable = true;
      package = pkgs.pnpm;
      install.enable = true;
    };
  };

  services.postgres = {
    enable = true;
    listen_addresses = "127.0.0.1";
    port = 5432;
    initialDatabases = [
      {
        name = "cookbook";
        user = "cookbook";
        pass = "cookbook";
      }
    ];
  };

  enterShell = ''
    # Kotlin/Native macOS linker: Nix DEVELOPER_DIR/xcrun → clang-wrapper with no lib/clang.
    if [ "$(uname -s)" = Darwin ]; then
      unset CC CXX DEVELOPER_DIR SDKROOT
      export PATH="/usr/bin:$PATH"
    fi
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

  profiles =
    let
      nativeGradleEnv = ''
        set -eu
        if [ "$(uname -s)" = Darwin ]; then
          unset CC CXX DEVELOPER_DIR SDKROOT
          export PATH="/usr/bin:$PATH"
        fi
      '';
    in
    {
      server = {
        module = {
          processes.server = {
            after = [ "devenv:processes:postgres" ];
            exec = nativeGradleEnv + ''
              cd "${root}"
              exec gradle :apps:server:run
            '';
            ready = {
              http.get = {
                port = 8080;
                path = "/health";
              };
              timeout = 600;
            };
          };
        };
      };
      web = {
        extends = [ "server" ];
        module = {
          processes.web = {
            after = [ "devenv:processes:server" ];
            exec = ''
              set -eu
              cd "${root}"
              exec pnpm --filter @cookbook/web exec vite --host
            '';
            ready = {
              http.get = {
                port = 5173;
                path = "/";
              };
            };
          };
        };
      };
      all = {
        extends = [ "web" ];
      };
    };
}
