// Mock for the TUI module
module.exports = {
  startTui: jest.fn(() => {
    console.log('Mock TUI started');
    return Promise.resolve();
  })
};
