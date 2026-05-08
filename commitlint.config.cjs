// Bundled inline from @dreher-media/commitlint-config. See prettier.config.js
// for the rationale on why public repos bundle rather than depend.
//
// Source: https://github.com/Dreher-Media/standards/blob/main/configs/commitlint-config/index.js

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'perf',
        'refactor',
        'docs',
        'chore',
        'build',
        'ci',
        'test',
        'style',
        'revert',
      ],
    ],
    // Inherit subject-case from config-conventional: disallow Sentence-case,
    // Start-case, PascalCase, UPPER-CASE — but allow proper nouns inside the
    // subject ("chore: migrate to Dreher-Media/standards" is fine, "Migrate to
    // standards" is not).
    'header-max-length': [2, 'always', 100],
  },
};
