module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: [
    'node_modules/',
    'sdk/',
    'android/',
    'ios/',
    'vendor/',
    'coverage/',
  ],
  rules: {
    // 'void promise' is the deliberate marker for a fire-and-forget async
    // call. NFC cleanup paths use it; the alternative is noisier.
    'no-void': ['error', {allowAsStatement: true}],
  },
  overrides: [
    {
      // Layer boundaries (CLAUDE.md): transport knows bytes, codec knows the
      // payload format, UI knows neither. Enforced here so a shortcut import
      // fails lint rather than quietly collapsing the layering.
      files: ['src/codec/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/transport/**', '**/ui/**'],
                message:
                  'src/codec must stay pure: no transport or UI imports (CLAUDE.md).',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['src/transport/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/ui/**'],
                message: 'src/transport must not import UI (CLAUDE.md).',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['src/domain/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/transport/**', '**/codec/**', '**/ui/**'],
                message:
                  'src/domain is the shared leaf layer and must not import other layers (CLAUDE.md).',
              },
            ],
          },
        ],
      },
    },
  ],
};
