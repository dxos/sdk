//
// Copyright 2020 DXOS.
//

import queueMicrotask from 'queue-microtask';

// The webpack shim process.nextTick is based on setTimeout(fn, 0). The worst thing to do.
// This hack fix that problem for now until we find a better solution and improve the latency.
if (typeof window !== 'undefined') {
  process.nextTick = (...args) => {
    if (args.length === 1) {
      return queueMicrotask(args[0]);
    }

    queueMicrotask(() => args[0](...args.slice(1, args.length)));
  };
}

export { createClient } from './client';
