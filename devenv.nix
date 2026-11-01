{ pkgs, config, ... }:
let
  root = config.devenv.root;
  jdkPackage = pkgs.zulu25;
in
{
  dotenv.enable = true;

  packages = [
    pkgs.git
    pkgs.kotlin
    pkgs.kotlin-language-server
    pkgs.seaweedfs
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

  processes.seaweed = {
    exec = ''
      set -eu
      dir="${root}/.devenv/state/seaweed"
      mkdir -p "$dir"
      cat > "$dir/s3.json" <<'EOF'
      {
        "identities": [
          {
            "name": "cookbook",
            "credentials": [
              {
                "accessKey": "cookbook",
                "secretKey": "cookbook"
              }
            ],
            "actions": ["Admin", "Read", "Write", "List", "Tagging"]
          }
        ]
      }
      EOF
      exec weed mini -dir "$dir" -volume.port 8081 -s3.port 8333 -s3.config "$dir/s3.json"
    '';
    ready = {
      http.get = {
        port = 9333;
        path = "/cluster/status";
      };
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
    unset DEVELOPER_DIR
    unset SDKROOT
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
          after = [ "devenv:processes:postgres" "devenv:processes:seaweed" ];
          exec = ''
            set -eu
            unset DEVELOPER_DIR
            unset SDKROOT
            cd "${root}"
            exec gradle :apps:api:runDebugExecutableNative
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
