//
// Copyright 2020 DXOS.org
//

import React, { ReactNode, useEffect, useState } from 'react';

import { Client, ClientConfig } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';
import { ErrorBoundary, ErrorView } from '@dxos/react-ux';

export interface ClientInitializerProps {
  config?: ClientConfig
  children?: ReactNode,
  preInitialize?: (client: Client) => Promise<void> | void,
}

/**
 * ClientInitializer - Provides Client initialization abstraction with error handling
 * @param preInitialize - Callback for any pre-initialization logic required for client before initializing it, e.g. model registration.
 */
// TODO(burdon): Bad abstraction -- hides client construction. Replace with ErrorWrapper.
// TODO(rzadp): removing preInitialize is blocked on:
// ISSUE: https://github.com/dxos/echo/issues/329
export const ClientInitializer = ({ config, children, preInitialize }: ClientInitializerProps) => {
  const [client] = useState(() => new Client(config));
  const [clientReady, setClientReady] = useState(false);
  const [error, setError] = useState<undefined | Error | string>(undefined);

  useEffect(() => {
    (async () => {
      await preInitialize?.(client);
      try {
        await client.initialize();
        setClientReady(true);
      } catch (ex) {
        setError(ex);
      }
    })();
  }, []);

  const handleRestart = () => {
    window.location.reload();
  };

  const handleReset = async () => {
    await client.reset();
    handleRestart();
  };

  if (error) {
    return <ErrorView onRestart={handleRestart} onReset={handleReset} error={error} />;
  }

  return (
    <ErrorBoundary
      config={config}
      onError={console.error}
      onRestart={handleRestart}
      onReset={handleReset}
    >
      <ClientProvider client={client}>
        {clientReady ? children : null}
      </ClientProvider>
    </ErrorBoundary>
  );
};

export default ClientInitializer;
