import { defineConfig } from "orval";

export default defineConfig({
  cookbook: {
    input: {
      target: "http://127.0.0.1:8080/swagger/documentation.json",
    },
    output: {
      mode: "tags-split",
      target: "./src/generated/endpoints.ts",
      schemas: "./src/generated/model",
      client: "solid-query",
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
