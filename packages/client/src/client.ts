//
// Copyright 2020 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';

import memdown from 'memdown';

import { createStorage } from '@dxos/random-access-multi-storage';
import { Keyring, KeyStore, KeyType } from '@dxos/credentials';
import { humanize, keyToString } from '@dxos/crypto';
import { FeedStore } from '@dxos/feed-store';
import { ModelConstructor, ModelFactory } from '@dxos/model-factory';
import { raise } from '@dxos/util';
import { NetworkManager, SwarmProvider } from '@dxos/network-manager';
import {
  codec, ECHO, PartyManager, PartyFactory, FeedStoreAdapter, IdentityManager, SecretProvider, InvitationOptions, InvitationDescriptor
} from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

import { defaultClientConfig } from './config';

export interface ClientConfig {
  /**
   * A random access storage instance.
   */
  storage?: any,

  /**
   * Swarm config.
   */
  swarm?: any

  /**
   * Keyring.
   */
  keyring?: Keyring

  /**
   * Optional. If provided, config.storage is ignored.
   */
  feedStore?: FeedStore

  /**
   * Optional. If provided, config.swarm is ignored.
   */
  networkManager?: NetworkManager

  /**
   * Optional.
   */
  partyManager?: PartyManager

  /**
   * Optional.
   */
  registry?: any
}

export interface CreateProfileOptions {
  publicKey?: Buffer
  secretKey?: Buffer
  username?: string
}

/**
 * Data client.
 */
export class Client {
  private readonly _feedStore: FeedStore;

  private readonly _keyring: Keyring;

  private readonly _swarmConfig?: any;

  private readonly _modelFactory: ModelFactory;

  private readonly _identityManager: IdentityManager;

  private readonly _networkManager: NetworkManager;

  private readonly _partyFactory: PartyFactory;

  private readonly _partyManager: PartyManager;

  private readonly _echo: ECHO;

  private readonly _registry?: any;

  private readonly _partyWriters = {};

  private readonly _feedOwnershipCache = new Map();

  private _initialized = false;
 
  constructor ({ storage, swarm, keyring, feedStore, networkManager, partyManager, registry }: ClientConfig) {
    this._feedStore = feedStore || new FeedStore(
      storage || createStorage('dxos-storage-db', 'ram'),
      { feedOptions: { valueEncoding: codec } });
    this._keyring = keyring || new Keyring(new KeyStore(memdown()));
    this._swarmConfig = swarm;

    this._identityManager = new IdentityManager(this._keyring);
    this._modelFactory = new ModelFactory()
      .registerModel(ObjectModel);

    this._networkManager = networkManager || new NetworkManager(this._feedStore, new SwarmProvider(this._swarmConfig));

    const feedStoreAdapter = new FeedStoreAdapter(this._feedStore);

    this._partyFactory = new PartyFactory(this._identityManager, feedStoreAdapter, this._modelFactory, this._networkManager);
    this._partyManager = partyManager || new PartyManager(this._identityManager, feedStoreAdapter, this._partyFactory);

    this._echo = new ECHO(this._partyManager);
    this._registry = registry;
  }

  /**
   * Initializes internal resources.
   */
  async initialize () {
    if (this._initialized) {
      return;
    }

    await this._keyring.load();

    // If this has to be done, it should be done thru database.
    // Actually, the we should move all initialze into database.
    await this._partyManager.open();

    if (!this._identityManager.halo && this._identityManager.identityKey) {
      await this._partyManager.createHalo();
    }
    this._initialized = true;
  }

  /**
   * Cleanup, release resources.
   */
  async destroy () {
    await this._echo.close();
    await this._networkManager.close();
  }

  /**
   * Resets and destroys client storage.
   * Warning: Inconsistent state after reset, do not continue to use this client instance.
   */
  async reset () {
    if (this._feedStore.storage.destroy) {
      await this._feedStore.storage.destroy();
    }

    await this._keyring.deleteAllKeyRecords();
  }

  /**
   * Create Profile. Add Identity key if public and secret key are provided. Then initializes profile with given username.
   * If not public and secret key are provided it relies on keyring to contain an identity key.
   */
  async createProfile ({ publicKey, secretKey, username }: CreateProfileOptions = {}) {
    if (publicKey && secretKey) {
      await this._keyring.addKeyRecord({ publicKey, secretKey, type: KeyType.IDENTITY });
    }

    if (!this._identityManager.identityKey) {
      throw new Error('Cannot create profile. Either no keyPair (public and secret key) was provided or cannot read Identity from keyring.');
    }
    await this._partyManager.createHalo({
      identityDisplayName: username || keyToString(this._identityManager.identityKey.publicKey)
    });
  }

  /**
   * @returns {ProfileInfo} User profile info.
   */
  getProfile () {
    if (!this._identityManager.identityKey) return;

    const publicKey = keyToString(this._identityManager.identityKey.publicKey);

    return {
      username: publicKey,
      publicKey
    };
  }

  /**
   * @returns true if the profile exists.
   */
  hasProfile () {
    return !!this.getProfile();
  }

  /**
   * @deprecated
   * Create a new party.
   * @return {Promise<Party>} The new Party.
   */
  async createParty () {
    return this._echo.createParty();
  }

  /**
   * @param partyKey Party publicKey
   */
  async createInvitation (partyKey: Uint8Array, secretProvider: SecretProvider, options?: InvitationOptions) {
    const party = await this.echo.getParty(partyKey) ?? raise(new Error(`Party not found ${humanize(partyKey)}`));
    return party.createInvitation({
      secretValidator: async (invitation, secret) => secret && secret.equals((invitation as any).secret), // TODO(marik-d): Probably an error here.
      secretProvider
    },
    options);
  }

  /**
   * @deprecated
   * @param {Buffer} publicKey Party publicKey
   * @param {Buffer} recipient Recipient publicKey
   */
  async createOfflineInvitation (partyKey: Uint8Array, recipientKey: Buffer) {
    console.warn('createOfflineInvitation deprecated. check Database');
  }

  /**
   * @deprecated
   * Join a Party by redeeming an Invitation.
   * @param {InvitationDescriptor} invitation
   * @param {SecretProvider} secretProvider
   * @returns {Promise<Party>} The now open Party.
   */
  async joinParty (invitation: InvitationDescriptor, secretProvider: SecretProvider) {
    console.warn('deprecated. Use client.echo');
  }

  /**
   * Redeems an invitation for this Device to be admitted to an Identity.
   * @param {InvitationDescriptor} invitation
   * @param {SecretProvider} secretProvider
   * @returns {Promise<DeviceInfo>}
   */
  async admitDevice (invitation: InvitationDescriptor, secretProvider: SecretProvider) {
    console.log('client.admitDevice: Device management is not implemented.');
  }

  /**
   * @deprecated
   */
  getParties () {
    console.warn('deprecated. Use client.echo');
  }

  /**
   * @deprecated
   */
  getParty (partyKey: Uint8Array) {
    console.warn('deprecated. Use client.echo');
  }

  /**
   * Returns an Array of all known Contacts across all Parties.
   * @returns {Contact[]}
   */
  async getContacts () {
    console.warn('client.getContacts not impl. Returning []');
    // return this._partyManager.getContacts();
    return [];
  }

  /**
   * @deprecated
   */
  async createSubscription () {
    console.warn('deprecated');
  }

  /**
   * Registers a new model.
   */
  registerModel (constructor: ModelConstructor<any>): this {
    this._modelFactory.registerModel(constructor);

    return this;
  }

  get keyring () {
    return this._keyring;
  }

  get echo () {
    return this._echo;
  }

  // keep this for devtools ???
  get feedStore () {
    return this._feedStore;
  }

  // TODO(burdon): Remove.
  /**
   * @deprecated
   */
  get modelFactory () {
    console.warn('client.modelFactory is deprecated.');
    return this._modelFactory;
  }

  // TODO(burdon): Remove.
  /**
   * @deprecated
   */
  get networkManager () {
    return this._networkManager;
  }

  // TODO(burdon): Remove.
  /**
   * @deprecated
   */
  get partyManager () {
    console.warn('deprecated. Use client.database');
    return this._partyManager;
  }

  get registry () {
    return this._registry;
  }
}

/**
 * Client factory.
 * @deprecated
 * @param {RandomAccessAbstract} feedStorage
 * @param {Keyring} keyring
 * @param {Object} config
 * @return {Promise<Client>}
 */
export const createClient = async (feedStorage?: any, keyring?: Keyring, config: { swarm?: any } = {}) => {
  config = defaultsDeep({}, config, defaultClientConfig);

  console.warn('createClient is being deprecated. Please use new Client() instead.');

  const client = new Client({
    storage: feedStorage,
    swarm: config.swarm,
    keyring // remove this later but it is required by cli, bots, and tests.
  });

  await client.initialize();

  return client;
};
