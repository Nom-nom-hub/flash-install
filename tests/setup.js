// Jest setup file

// Mock the TUI module
jest.mock('../src/tui/index.js', () => ({
  startTui: jest.fn(() => {
    console.log('Mock TUI started');
    return Promise.resolve();
  })
}), { virtual: true });

// Mock React directly
jest.mock('react', () => ({
  createElement: jest.fn(),
  Fragment: 'Fragment',
  useState: jest.fn(() => [null, jest.fn()]),
  useEffect: jest.fn(),
  useContext: jest.fn(),
  useReducer: jest.fn(() => [{}, jest.fn()]),
  useRef: jest.fn(() => ({ current: null })),
  createContext: jest.fn(() => ({
    Provider: 'Provider',
    Consumer: 'Consumer'
  }))
}), { virtual: true });

// Mock Ink directly
jest.mock('ink', () => ({
  Box: 'Box',
  Text: 'Text',
  Color: 'Color',
  Static: 'Static',
  Newline: 'Newline',
  Spacer: 'Spacer',
  Spinner: 'Spinner',
  render: jest.fn(() => ({
    unmount: jest.fn(),
    waitUntilExit: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn(),
    rerender: jest.fn()
  })),
  useInput: jest.fn(),
  useApp: jest.fn(() => ({ exit: jest.fn() })),
  useFocus: jest.fn(() => ({ isFocused: true })),
  useFocusManager: jest.fn(() => ({ focusNext: jest.fn(), focusPrevious: jest.fn() }))
}), { virtual: true });

// Mock other UI components
jest.mock('ink-select-input', () => ({
  default: 'SelectInput'
}), { virtual: true });

jest.mock('ink-text-input', () => ({
  default: 'TextInput'
}), { virtual: true });

// Mock process.exit to prevent tests from exiting
const originalExit = process.exit;
process.exit = (code) => {
  console.log(`Mock process.exit called with code ${code}`);
  // Don't actually exit
};
