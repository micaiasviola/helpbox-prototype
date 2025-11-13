export default {
  testEnvironment: 'jsdom',
  transform: {},
  roots: ['<rootDir>', '<rootDir>/../FrontEnd'],
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  transformIgnorePatterns: [],
  moduleFileExtensions: ['js'],

  moduleNameMapper: {
    '^\\.\\.\\/api\\/chamados\\.js$': '<rootDir>/../FrontEnd/js/__mocks__/api/chamados.js',
    '^\\.\\.\\/utils\\/feedbackmodal\\.js$': '<rootDir>/../FrontEnd/js/__mocks__/utils/feedbackmodal.js'
  },
};