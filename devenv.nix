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

  profiles = {
    server = {
      module = {
        processes.server = {
          after = [ "devenv:processes:postgres" ];
          exec = ''
            set -eu
            cd "${root}"
            exec gradle :server:run
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
            exec pnpm --filter web dev
          '';
          ready = {
            http.get = {
              port = 3000;
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
