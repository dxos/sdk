//
// Copyright 2020 DXOS.org
//

import { Chance } from 'chance';
import { useContext, useEffect, useState, useCallback } from 'react';

import { createId } from '@dxos/crypto';
import { useModel } from '@dxos/react-client';

import { AppKitContext } from './context';

// TODO(burdon): Extract data generators.
const chance = new Chance();

export const usePads = () => {
  const { pads = [] } = useContext(AppKitContext);
  return [pads];
};

export const useItems = ({ topic, types }) => {
  const [items, setItems] = useState([]);
  const [pads] = usePads();

  const model = useModel({ options: { type: types || pads.map(pad => pad.type), topic } });

  const createItem = useCallback((type, meta) => {
    const create = async () => {
      const id = createId();
      const title = `item-${chance.word()}`;

      const itemData = { __type_url: type, ...(meta || { id, title }) };
      await model.appendMessage(itemData);
      return itemData;
    };

    return create();
  }, [model]);

  useEffect(() => {
    if (!model) return;
    setItems(model.messages);
  }, [model]);

  return {
    items,
    createItem
  };
};
