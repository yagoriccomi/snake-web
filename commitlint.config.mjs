/**
 * Conventional Commits como contrato de histórico, com a mesma regra do
 * snake-server: o histórico responde "quando isso quebrou e por quê".
 */
const commitlintConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'perf', 'test', 'docs', 'build', 'ci', 'chore', 'revert'],
    ],
    // Assunto em português, sem ponto final e com limite legível.
    'subject-case': [0],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 100],
  },
};

export default commitlintConfig;
