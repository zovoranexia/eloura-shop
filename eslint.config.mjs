import nextVitals from 'eslint-config-next/core-web-vitals';

const config = [
  ...nextVitals,
  { ignores: ['.next/**', 'node_modules/**', 'design/**', 'next-env.d.ts'] },
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      // React-Compiler-style performance advice: effects that sync props/URL/storage into state are intentional here
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];
export default config;
