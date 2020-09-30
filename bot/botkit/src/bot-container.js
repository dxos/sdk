//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import path from 'path';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs-extra';
import kill from 'tree-kill';
import watch from 'node-watch';
import moment from 'moment';

import { keyToString } from '@dxos/crypto';

import { NATIVE_ENV, SourceManager, removeSourceFiles } from './source-manager';
import { log, logBot } from './log';

// Directory inside BOT_PACKAGE_DOWNLOAD_DIR/<CID> in which bots are spawned, in their own UUID named subdirectory.
export const SPAWNED_BOTS_DIR = '.bots';

export class BotContainer extends EventEmitter {
  /**
   * @constructor
   * @param {object} config
   */
  constructor (config) {
    super();

    this._config = config;
    this._sourceManager = new SourceManager(config);
  }

  async start (options) {
    const { controlTopic } = options;
    this._controlTopic = controlTopic;
  }

  async stop () {

  }

  async getBotAttributes (botName, botId, uniqId, ipfsCID, env, options) {
    const botPathInfo = await this._sourceManager.getBotPathInfo(uniqId, ipfsCID, env, options);
    assert(botPathInfo, `Invalid bot: ${botName || ipfsCID}`);

    const childDir = path.join(botPathInfo.installDirectory, SPAWNED_BOTS_DIR, botId);
    await fs.ensureDir(childDir);

    const { command, args } = this._sourceManager.getCommand(botPathInfo, env);
    return { childDir, command, args };
  }

  /**
   * Start bot instance.
   * @param {String} botId
   * @param {Object} options
   */
  async startBot (botId, botInfo, options = {}) {
    const { name, env, childDir, command, args } = botInfo || options;

    const wireEnv = {
      WIRE_BOT_CONTROL_TOPIC: keyToString(this._controlTopic),
      WIRE_BOT_UID: botId,
      WIRE_BOT_NAME: name,
      WIRE_BOT_CWD: childDir,
      WIRE_BOT_RESTARTED: !!botInfo
    };

    const nodePath = (env !== NATIVE_ENV) ? this._config.get('cli.nodePath') : undefined;

    const childOptions = {
      env: {
        ...process.env,
        NODE_OPTIONS: '',
        ...(nodePath ? { NODE_PATH: nodePath } : {}),
        ...wireEnv
      },

      cwd: childDir,

      // https://nodejs.org/api/child_process.html#child_process_options_detached
      detached: false
    };

    const botProcess = spawn(command, args, childOptions);

    const timeState = {
      started: moment.utc(),
      lastActive: moment.utc()
    };

    const watcher = watch(childDir, { recursive: true }, () => {
      timeState.lastActive = moment.utc();
    });

    if (botInfo) {
      // Restart.
      Object.assign(botInfo, {
        process: botProcess,
        watcher,
        stopped: false,
        ...timeState
      });
    } else {
      // New instance.
      botInfo = {
        botId,
        childDir,
        process: botProcess,
        id: options.botName,
        parties: [],
        command,
        args,
        watcher,
        stopped: false,
        name,
        env,
        ...timeState
      };
    }

    log(`Spawned bot: ${JSON.stringify({ pid: botProcess.pid, command, args, wireEnv, cwd: childDir })}`);

    botProcess.stdout.on('data', (data) => {
      logBot[botProcess.pid](`${data}`);
    });

    botProcess.stderr.on('data', (data) => {
      logBot[botProcess.pid](`${data}`);
    });

    botProcess.on('close', code => {
      this.emit('bot-close', botId, code);
      log(`Bot pid: ${botProcess.pid} exited with code ${code}.`);
    });

    botProcess.on('error', (err) => {
      logBot[botProcess.pid](`Error: ${err}`);
    });

    return botInfo;
  }

  async stopBot (botInfo) {
    const { process, watcher } = botInfo;

    if (process && process.pid) {
      kill(process.pid, 'SIGKILL');
    }
    if (watcher) {
      watcher.close();
    }
  }

  async killBot (botInfo) {
    await this.stopBot(botInfo);

    const { childDir } = botInfo;
    if (childDir) {
      await fs.remove(childDir);
    }
  }

  async removeSource () {
    await removeSourceFiles();
  }

  serializeBot ({ id, botId, type, childDir, parties, command, args, stopped, name, env }) {
    return {
      id,
      botId,
      type,
      name,
      childDir,
      parties,
      command,
      args,
      stopped,
      env
    };
  }
}