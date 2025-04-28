import React from 'react';
import { render } from 'ink';
import App from './app.js';

/**
 * Start the TUI application
 * @param projectDir Project directory
 */
export function startTui(projectDir: string): void {
  const { waitUntilExit } = render(<App projectDir={projectDir} />);
  
  // Wait until the app exits
  waitUntilExit().then(() => {
    process.exit(0);
  });
}

export default startTui;
