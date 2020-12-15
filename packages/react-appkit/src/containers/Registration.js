//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';

import { Dialog, DialogContent, DialogContentText, DialogTitle } from '@material-ui/core';

import { keyPairFromSeedPhrase } from '@dxos/credentials';
import { decrypt } from '@dxos/crypto';
import { useClient, useConfig } from '@dxos/react-client';
import { useQuery, createUrl } from '@dxos/react-router';
import { FullScreen } from '@dxos/react-ux';

import RegistrationDialog from '../components/RegistrationDialog';
import { useSentry } from '../hooks';

const Registration = () => {
  console.log('I am here');
  const [open, setOpen] = useState(true);
  const history = useHistory();
  const { redirectUrl = '/', ...rest } = useQuery();
  const client = useClient();
  const config = useConfig();
  const [recovering, setRecovering] = useState(false);
  const sentry = useSentry();

  const clearIdentity = async () => {
    setOpen(false);

    // TODO(telackey): Replace with feedStore.deleteAll() once that is published in @dxos/feed-store
    // cf. https://github.com/dxos/feed-store/pull/13
    await Promise.all(client.feedStore.getDescriptors().map(({ path }) => client.feedStore.deleteDescriptor(path)));
  };

  const handleFinishCreate = async (username, seedPhrase) => {
    await clearIdentity();
    const identityKeyPair = keyPairFromSeedPhrase(seedPhrase);
    await client.createProfile({ ...identityKeyPair, username });
    if (sentry) {
      sentry.setUser({ username: `${username}-${identityKeyPair.publicKey.toString('hex')}`, id: identityKeyPair.publicKey.toString('hex') });
      sentry.captureMessage('User registered.');
    }

    // await client.partyManager.identityManager.initializeForNewIdentity({
    //   identityDisplayName: username || keyToString(client.partyManager.identityManager.publicKey),
    //   deviceDisplayName: keyToString(client.partyManager.identityManager.deviceManager.publicKey)
    // });

    history.push(createUrl(redirectUrl, rest));
  };

  const handleFinishRestore = async (seedPhrase) => {
    await clearIdentity();
    setRecovering(true);
    await client.echo.recoverHalo(seedPhrase);
    setRecovering(false);
    history.push(createUrl(redirectUrl, rest));
  };

  const keyringDecrypter = async (data, passphrase) => {
    await client.echo.keyring.loadJSON(decrypt(data, passphrase));
  };

  return (
    <FullScreen>
      <RegistrationDialog
        keyringDecrypter={keyringDecrypter}
        open={open}
        debug={config.debug.mode === 'development'}
        onFinishCreate={handleFinishCreate}
        onFinishRestore={handleFinishRestore}
      />
      {recovering && (
        <Dialog open maxWidth='sm'>
          <DialogTitle>Recovering...</DialogTitle>
          <DialogContent>
            <DialogContentText>One of your other devices needs to be online.</DialogContentText>
          </DialogContent>
        </Dialog>
      )}
    </FullScreen>
  );
};

export default Registration;
