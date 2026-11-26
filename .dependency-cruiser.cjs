/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'shared-stays-lean',
      severity: 'error',
      from: { path: '^packages/shared/' },
      to: { pathNot: ['^packages/shared/', 'node_modules/zod'] },
    },
    {
      name: 'protocol-depends-only-on-shared-and-zod',
      severity: 'error',
      from: { path: '^packages/protocol/' },
      to: { pathNot: ['^packages/protocol/', '^packages/shared/', 'node_modules/zod'] },
    },
    {
      name: 'packages-never-import-apps',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'client-never-imports-server',
      severity: 'error',
      from: { path: '^apps/client/' },
      to: { path: '^apps/game-server/' },
    },
    {
      name: 'server-never-imports-client',
      severity: 'error',
      from: { path: '^apps/game-server/' },
      to: { path: '^apps/client/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: {
      path: ['\\.test\\.ts$', '(^|/)dist/', '^apps/client/public/', '^scripts/'],
    },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
};
