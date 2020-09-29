//
// Copyright 2020 DXOS.org
//

import fs from 'fs-extra';
import path from 'path';
import Queue from 'fastq';
import { callbackify } from 'util';

import { Bot } from '@dxos/botkit';
import { docToMarkdown /*, markdownToDoc */ } from '@dxos/editor-core';
import { TextModel, TYPE_TEXT_MODEL_UPDATE } from '@dxos/text-model';

import { cloneRepo, commitAndPush } from './git';

const commitAndPushAsync = callbackify(commitAndPush);

/**
 * Worker function for queue.
 * @param {{ repoPath }} options
 * @param {Function} cb
 */
const updateRepo = async (options, cb) => {
  const { repoPath } = options;

  commitAndPushAsync(repoPath, cb);
};

const TYPE_EDITOR_DOCUMENT = 'wrn_dxos_org_teamwork_editor_document';
const REPO_PATH = './repos';

// Timeout after last model update event before saving to filesystem.
const FILE_UPDATE_TIMEOUT = 3000;
// Maximum postponing time of a filesystem write due to a continuous document updating.
const MAX_NON_UPDATED_TIME = 30000;

// Timeout after last filesystem update before updating repo.
const GIT_UPDATE_TIMEOUT = 20000;
// Maximum postponing time of an updating repo due to a continuous saving to filesystem.
const MAX_NON_COMMITED_TIME = 60000;

const WORKERS_NUM = 1;

/**
 * GitHub bot.
 */
export class GitHubBot extends Bot {
  /**
   * @type {Map<String, {documentId: String, displayName: String, topic: String, docModel: Model, lastSave: Number}>}
   */
  _docs = new Map();

  _botParties = new Map();

  constructor (config) {
    super(config);

    this.on('party', async (topic) => {
      await this.joinParty(topic);
    });

    this._queue = Queue(updateRepo, WORKERS_NUM);
  }

  async botCommandHandler (message) {
    const command = JSON.parse(message.toString()) || {};
    let result = {};
    switch (command.type) {
      case 'list': {
        result = [...this._botParties.values()];
        break;
      }
      case 'assign': {
        const { topic, repo, username, token } = command;
        let success = false;
        if (topic && this._botParties.has(topic) && repo) {
          await this._assignRepo(topic, repo, username, token);
          success = true;
        }
        result = { success };
        break;
      }
      default:
        break;
    }

    return Buffer.from(JSON.stringify(result));
  }

  /**
   * Join party.
   * @param {String} topic
   */
  async joinParty (topic) {
    console.log(`Joining party '${topic}'.`);
    this._botParties.set(topic, { topic });

    const model = await this._client.modelFactory.createModel(undefined, { type: [TYPE_EDITOR_DOCUMENT], topic });

    model.on('update', async () => {
      if (model.messages) {
        for (const message of model.messages) {
          const { itemId, displayName } = message;
          if (!this._docs.has(itemId)) {
            console.log(`Opening doc '${itemId}'.`);
            const docModel = await this._client.modelFactory.createModel(TextModel, { type: [TYPE_TEXT_MODEL_UPDATE], topic, documentId: itemId });
            this._docs.set(itemId, { documentId: itemId, displayName, docModel, topic });

            docModel.on('update', async () => this._handleDocUpdate(itemId));
          }
        }
      }
    });
  }

  /**
   * Assign repo to a specific party.
   * @param {String} topic
   * @param {String} repo
   * @param {String} username
   * @param {String} token
   */
  async _assignRepo (topic, repo, username, token) {
    const repoPath = path.join(this._cwd, REPO_PATH, topic);
    if (await fs.exists(repoPath)) {
      throw new Error('Party has already being replicated to another repo.');
    }

    await fs.ensureDir(repoPath);
    await cloneRepo(repoPath, repo, username, token);

    this._botParties.set(topic, { topic, repo, repoPath });
  }

  /**
   * @param {String} documentId
   */
  async _handleDocUpdate (documentId) {
    const docInfo = this._docs.get(documentId);
    const { docModel, topic, lastSave = Date.now() } = docInfo;

    const partyInfo = this._botParties.get(topic) || {};
    const { repo, repoPath } = partyInfo;

    if (repo && repoPath) {
      const updateDoc = async () => {
        const text = docToMarkdown(docModel.doc);
        const docPath = path.join(repoPath, `${documentId}.md`);

        docInfo.lastSave = Date.now();

        await fs.writeFile(docPath, text);

        await this._handleRepoUpdate(partyInfo);
      };

      if (docInfo.updateTimer) {
        clearTimeout(docInfo.updateTimer);
      }

      // Timer for file save.
      if (Date.now() - lastSave > MAX_NON_UPDATED_TIME) {
        await updateDoc();
      } else {
        docInfo.updateTimer = setTimeout(updateDoc, FILE_UPDATE_TIMEOUT);
      }
    }
  }

  /**
   * @param {Object} partyInfo
   */
  async _handleRepoUpdate (partyInfo) {
    const { repoPath, lastUpdate = Date.now() } = partyInfo;

    // Timer for git operations.
    const pushToQueue = () => {
      this._queue.push({
        repoPath
      }, err => console.error(err));
    };

    if (partyInfo.updateTimer) {
      clearTimeout(partyInfo.updateTimer);
    }

    if (Date.now() - lastUpdate > MAX_NON_COMMITED_TIME) {
      pushToQueue();
    } else {
      partyInfo.updateTimer = setTimeout(pushToQueue, GIT_UPDATE_TIMEOUT);
    }
  }
}
