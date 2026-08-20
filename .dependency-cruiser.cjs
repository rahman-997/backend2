module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "controllers-do-not-own-data-access",
      severity: "error",
      from: { path: "\\.controller\\.ts$" },
      to: { path: "(^|/)(db|generated)/|\\.repository\\.ts$" },
    },
    {
      name: "routes-do-not-own-data-access",
      severity: "error",
      from: { path: "\\.routes\\.ts$" },
      to: { path: "(^|/)(db|generated)/|\\.repository\\.ts$" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules|src/generated" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      conditionNames: ["types", "import", "default"],
    },
  },
};
