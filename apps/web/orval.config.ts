import { defineConfig } from "orval";

export default defineConfig({
  cookbook: {
    input: {
      target: "http://127.0.0.1:8080/api/v1/swagger/documentation.json",
    },
    output: {
      mode: "tags-split",
      target: "./src/generated/endpoints.ts",
      schemas: "./src/generated/model",
      /**
       * The solid-start client, with its imports adjusted for Router 2: `query` from the router
       * (it also lists `cache`, which Router 2 removed), and mutations wrapped in `mutation` from
       * the mutator instead of the router's form `action`, which only works with router context.
       */
      client: (clients) => ({
        ...clients["solid-start"],
        dependencies: () => [
          { dependency: "@solidjs/router", exports: [{ name: "query", values: true }] },
          {
            dependency: "../../mutator.ts",
            exports: [{ name: "mutation", alias: "action", values: true }],
          },
        ],
      }),
      httpClient: "fetch",
      clean: true,
      override: {
        mutator: {
          path: "./src/mutator.ts",
          name: "customInstance",
        },
      },
    },
  },
});
