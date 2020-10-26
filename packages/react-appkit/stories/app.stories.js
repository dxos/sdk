//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { Route, Switch, useParams } from 'react-router-dom';
import Box from '@material-ui/core/Box';
import StoryRouter from 'storybook-react-router';
import { withKnobs } from '@storybook/addon-knobs';

import { keyToBuffer, keyToString } from '@dxos/crypto';
import { ErrorHandler } from '@dxos/debug';
import { useClient, useParties, useParty } from '@dxos/react-client';

import { AppKitContextProvider } from '../src';
import { WithClientAndIdentity, WithPartyKnobs } from './decorators';
import { pads } from './common';

export default {
  title: 'AppKit',
  decorators: [WithPartyKnobs, WithClientAndIdentity, StoryRouter(), withKnobs]
};

const NoPartyComponent = () => {
  const client = useClient();
  const parties = useParties();

  const keys = client.keyring.keys;

  const handleCreate = async () => {
    await client.partyManager.createParty();
  };

  return (
    <Box m={2}>
      <p>Create and select a party using the knobs.</p>
      <h2>Keys</h2>
      {keys.map(key => (
        <div key={key.publicKey}>{key.key}</div>
      ))}
      <h2>Parties</h2>
      {parties.map(party => {
        const publicKey = keyToString(party.key);
        return (<div key={publicKey}>{publicKey}</div>);
      })}
      <button onClick={handleCreate}>Add Party</button>
    </Box>
  );
};

const PartyComponent = () => {
  const { topic } = useParams();
  const party = useParty(keyToBuffer(topic));

  return (
    <Box m={2}>
      <h1>Party</h1>
      <div>Public Key: {keyToString(party.key)}</div>
      <div>DisplayName: {party.displayName}</div>
    </Box>
  );
};

export const withAppKitProvider = () => (
  <AppKitContextProvider initialState={{}} errorHandler={new ErrorHandler()} pads={pads}>
    <Switch>
      <Route path='/:topic' exact component={PartyComponent} />
      <Route path='/' exact component={NoPartyComponent} />
    </Switch>
  </AppKitContextProvider>
);
