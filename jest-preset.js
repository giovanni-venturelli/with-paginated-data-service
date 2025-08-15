// Mirror of jest.preset.js to satisfy Jest's expectation for a module-level preset file
// Jest (when invoked directly) requires a module exposing a "jest-preset.js" file at its root.
// Nx-generated workspaces often use "jest.preset.js" (with a dot). We provide this hyphenated
// variant that simply re-exports the same Nx preset.

const nxPreset = require('@nx/jest/preset').default;

module.exports = { ...nxPreset };
