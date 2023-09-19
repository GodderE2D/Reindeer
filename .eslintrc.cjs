module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "simple-import-sort"],
  rules: {
    "@typescript-eslint/no-unused-vars": "warn",
    "no-unused-vars": "off",
    "no-var": "error",
    "no-console": "error",
    "no-warning-comments": "warn",
    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",
    "no-restricted-globals": [
      "error",
      {
        name: "Buffer",
        message: "Import Buffer from `node:buffer` instead",
      },
      {
        name: "process",
        message: "Import process from `node:process` instead",
      },
      {
        name: "setTimeout",
        message: "Import setTimeout from `node:timers` instead",
      },
      {
        name: "setInterval",
        message: "Import setInterval from `node:timers` instead",
      },
      {
        name: "setImmediate",
        message: "Import setImmediate from `node:timers` instead",
      },
      {
        name: "clearTimeout",
        message: "Import clearTimeout from `node:timers` instead",
      },
      {
        name: "clearInterval",
        message: "Import clearInterval from `node:timers` instead",
      },
    ],
  },
};
