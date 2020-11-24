//
// Copyright 2020 DXOS.org
//

import path from 'path';

import { ChildProcessContainer } from './child-process-container';
import { NODE_BOT_MAIN_FILE } from './common';

/**
 * Node Bot Container; Used for spawning bots as node processes.
 */
export class NodeBotContainer extends ChildProcessContainer {
  constructor(
    private readonly _nodePath: string
  ) {
    super();
  }

  /**
   * Get process command (to spawn).
   */
  protected _getCommand (installDirectory: string) {
    return {
      command: 'node',
      args: [path.join(installDirectory, NODE_BOT_MAIN_FILE)],
      env: {
        NODE_PATH: this._nodePath,
      }
    };
  }
}
