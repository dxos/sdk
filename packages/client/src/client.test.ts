//
// Copyright 2020 DXOS.org
//

import { createKeyPair } from '@dxos/crypto';

import { Client } from './client';

test('client initialize', async () => {
  const client = new Client();
  await client.initialize();

  // TODO(burdon): Profiling (takes 6s).
  // TODO(burdon): What if not provided?
  const keypair = createKeyPair();
  await client.createProfile({ ...keypair, username: 'testuser' });

  expect(client.hasProfile()).toBeTruthy();
  expect(client.getProfile()).toBeDefined();

  // TODO(burdon): Test has closed.
  await client.destroy();
});

// TODO(burdon): This breaks.
test.skip('client idempotent calls', async () => {
  const client = new Client();
  await client.initialize();
  await client.initialize();

  const keypair = createKeyPair();
  await client.createProfile({ ...keypair, username: 'testuser' });
  await client.createProfile({ ...keypair, username: 'testuser' });

  expect(client.hasProfile()).toBeTruthy();
  expect(client.getProfile()).toBeDefined();

  await client.destroy();
  await client.destroy();
});
