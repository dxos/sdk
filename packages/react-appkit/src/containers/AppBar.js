//
// Copyright 2020 DXOS.org
//

import React, { Fragment, useCallback, useState } from 'react';

import { makeStyles } from '@material-ui/core';
import MuiAppBar from '@material-ui/core/AppBar';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import ProfileIcon from '@material-ui/icons/AccountCircle';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';

import HomeIcon from '@material-ui/icons/Home';
import MenuIcon from '@material-ui/icons/Menu';
import MoreIcon from '@material-ui/icons/MoreVert';
import ShareIcon from '@material-ui/icons/Share';

import { BotFactoryClient } from '@dxos/botkit-client';
import { generatePasscode } from '@dxos/credentials';
import { encrypt, decrypt, keyToBuffer, verify, SIGNATURE_LENGTH } from '@dxos/crypto';
import { InviteType, InviteDetails } from '@dxos/party-manager';
import { useClient, useConfig, useProfile } from '@dxos/react-client';

import BotDialog from '../components/BotDialog';
import ExportKeyringDialog from '../components/ExportKeyringDialog';
import ImportKeyringDialog from '../components/ImportKeyringDialog';
import InvitationDialog from '../components/InvitationDialog';

import { Action, useActionHandler, useAppRouter } from '../hooks';

const ACTION_USER_INVITATION = 1;
const ACTION_DEVICE_INVITATION = 2;
const ACTION_BOT_INVITATION = 3;
const ACTION_EXPORT_KEYRING = 4;
const ACTION_IMPORT_KEYRING = 5;
const ACTION_RESET_STORAGE = 6;
const ACTION_OPEN_SETTINGS = 7;
const ACTION_OPEN_PARTY_HOME = 8;

const useStyles = makeStyles(theme => ({
  logo: {
    color: 'inherit'
  },

  title: {
    marginRight: theme.spacing(8)
  },

  content: {
    display: 'flex',
    flex: 1
  }
}));

/**
 * App header.
 */
const AppBar = ({ topic, children, onToggleNav, onSettingsOpened, onHomeNavigation, onPartyHomeNavigation }) => {
  const classes = useStyles();
  const client = useClient();
  const config = useConfig();
  const profile = useProfile();
  const router = useAppRouter();
  const handleAction = useActionHandler();

  const [{ dialog, target } = {}, setDialog] = useState();
  const [invitation, setInvitation] = useState(null);
  const [passcode, setPasscode] = useState(null);
  const [menuTarget, setMenuTarget] = useState(null);

  const handleMenuClick = useCallback(event => {
    setMenuTarget(event.target);
  });

  const handleMenuClose = useCallback(() => {
    setMenuTarget();
  });

  const handleMenuItemClick = useCallback(handler => () => {
    handler();
    handleMenuClose();
  });

  const handleClose = () => setDialog();

  /**
   * Initiate the bot invitation flow.
   */
  const handleBotInvite = async (botFactoryTopic, spec) => {
    const { botId, ...rest } = spec;
    const botFactoryClient = new BotFactoryClient(client.networkManager, botFactoryTopic);

    const secretProvider = () => {};

    // Provided by inviter node.
    const secretValidator = async (invitation, secret) => {
      const signature = secret.slice(0, SIGNATURE_LENGTH);
      const message = secret.slice(SIGNATURE_LENGTH);
      return verify(message, signature, keyToBuffer(botFactoryTopic));
    };

    const invitation = await client.partyManager.inviteToParty(
      keyToBuffer(topic),
      new InviteDetails(InviteType.INTERACTIVE, {
        secretValidator,
        secretProvider
      }),
      {
        onFinish: () => {
          botFactoryClient.close();
          setDialog();
        }
      }
    );

    // TODO(burdon): Review function signature (e.g., rest before invitation? OK to remove botId?)
    await botFactoryClient.sendSpawnRequest(botId, topic, rest, invitation.toQueryParameters());
  };

  /**
   * Initiate the user invitation flow.
   */
  const handleUserInvite = async ({ target }) => {
    if (topic) {
      // TODO(burdon): Factor out.
      const partyKey = keyToBuffer(topic);
      const invitation = await client.partyManager.inviteToParty(
        partyKey,
        new InviteDetails(InviteType.INTERACTIVE, {
          secretValidator: (invitation, secret) => secret && secret.equals(invitation.secret),
          secretProvider: () => {
            const passcode = generatePasscode();
            setPasscode(passcode);
            return Buffer.from(passcode);
          }
        }),
        {
          onFinish: () => setDialog()
        }
      );

      setInvitation(invitation);
      setPasscode(null);
    }

    setDialog({ dialog: ACTION_USER_INVITATION, target });
  };

  /**
   * Initiate the device invitation flow.
   */
  const handleDeviceInvite = async () => {
    const invitation = await client.partyManager.identityManager.deviceManager.addDevice(
      (invitation, secret) => secret && secret.equals(invitation.secret),
      () => {
        const passcode = generatePasscode();
        setPasscode(passcode);
        return Buffer.from(passcode);
      },
      {
        onFinish: () => setDialog()
      }
    );

    setInvitation(invitation);
    setPasscode(null);

    setDialog({ dialog: ACTION_DEVICE_INVITATION });
  };

  // TODO(burdon): Broken.
  const keyringEncrypter = async passphrase => {
    const keyring = await client.keyringStore.getKeyring(topic);
    return encrypt(keyring.toJSON(), passphrase);
  };

  // TODO(burdon): Broken.
  const keyringDecrypter = async (data, passphrase) => {
    const keyring = await client.keyringStore.getKeyring(topic);
    await keyring.loadJSON(decrypt(data, passphrase));
  };

  //
  // Actions
  //

  const actions = {
    [ACTION_USER_INVITATION]: {
      Icon: ShareIcon,
      handler: handleUserInvite
    },

    [ACTION_DEVICE_INVITATION]: {
      label: 'Authorize device',
      handler: handleDeviceInvite
    },

    [ACTION_BOT_INVITATION]: {
      label: 'Invite bot',
      handler: () => {
        setDialog({ dialog: ACTION_BOT_INVITATION });
      }
    },

    [ACTION_EXPORT_KEYRING]: {
      label: 'Export keys',
      handler: () => {
        setDialog({ dialog: ACTION_EXPORT_KEYRING });
      }
    },

    [ACTION_IMPORT_KEYRING]: {
      label: 'Import keys',
      handler: () => {
        setDialog({ dialog: ACTION_IMPORT_KEYRING });
      }
    },

    [ACTION_RESET_STORAGE]: {
      label: 'Reset Storage',
      handler: async () => {
        localStorage.clear();
        await client.reset();
        handleAction(Action.RELOAD);
      }
    },

    [ACTION_OPEN_SETTINGS]: {
      label: 'Settings',
      handler: async () => {
        onSettingsOpened && onSettingsOpened();
      }
    },

    [ACTION_OPEN_PARTY_HOME]: {
      label: 'Party Homepage',
      handler: async () => {
        onPartyHomeNavigation && onPartyHomeNavigation();
      }
    }
  };

  const action = key => ({ key, ...actions[key] });

  //
  // Buttons
  //

  const buttons = [];

  //
  // Menu items
  //

  const menuItems = [
    action(ACTION_DEVICE_INVITATION)
  ];

  if (topic) {
    menuItems.push(action(ACTION_EXPORT_KEYRING));
    menuItems.push(action(ACTION_IMPORT_KEYRING));
  }

  if (onSettingsOpened) {
    menuItems.push(action(ACTION_OPEN_SETTINGS));
  }

  if (onPartyHomeNavigation) {
    menuItems.push(action(ACTION_OPEN_PARTY_HOME));
  }

  menuItems.push(action(ACTION_RESET_STORAGE));

  //
  // Dialogs
  //

  const dialogs = [
    {
      key: ACTION_USER_INVITATION,
      dialog: (
        <InvitationDialog
          anchorEl={dialog === ACTION_USER_INVITATION && target}
          topic={topic}
          link={invitation && router.createInvitationUrl(invitation)}
          passcode={passcode}
          title='Invitation User'
          message={passcode ? 'The peer has connected.' : 'A passcode will be generated once the remote peer connects.'}
          onClose={handleClose}
        />
      )
    },
    {
      key: ACTION_DEVICE_INVITATION,
      dialog: (
        <InvitationDialog
          open={dialog === ACTION_DEVICE_INVITATION}
          link={invitation && router.createInvitationUrl(invitation)}
          passcode={passcode}
          title='Authorize Device'
          message={passcode ? 'The peer has connected.' : 'A passcode will be generated once the remote peer connects.'}
          onClose={handleClose}
        />
      )
    },
    {
      key: ACTION_BOT_INVITATION,
      dialog: (
        <BotDialog
          open={dialog === ACTION_BOT_INVITATION}
          onSubmit={({ topic: botFactoryTopic, spec }) => handleBotInvite(botFactoryTopic, spec)}
          onClose={handleClose}
        />
      )
    },
    {
      key: ACTION_EXPORT_KEYRING,
      dialog: (
        <ExportKeyringDialog
          open={dialog === ACTION_EXPORT_KEYRING}
          topic={topic}
          onClose={handleClose}
          encrypter={keyringEncrypter}
        />
      )
    },
    {
      key: ACTION_IMPORT_KEYRING,
      dialog: (
        <ImportKeyringDialog
          open={dialog === ACTION_IMPORT_KEYRING}
          onClose={handleClose}
          decrypter={keyringDecrypter}
        />
      )
    }
  ];

  return (
    <MuiAppBar position='static'>
      <Toolbar variant='dense'>
        {onToggleNav && (
          <IconButton
            edge='start'
            color='inherit'
            aria-label='toggle sidebar'
            onClick={onToggleNav}
          >
            <MenuIcon />
          </IconButton>
        )}
        {onHomeNavigation && (
          <IconButton
            edge='start'
            color='inherit'
            aria-label='home'
            onClick={onHomeNavigation}
          >
            <HomeIcon />
          </IconButton>
        )}
        <Grid container wrap='nowrap' alignItems='center'>
          <Typography variant='h6' className={classes.title}>{config.app.name}</Typography>

          <div className={classes.content}>
            {children}
          </div>
        </Grid>

        {/* Buttons */}
        {buttons.map(({ key, Icon, handler }) => (
          <IconButton
            key={key}
            color='inherit'
            onClick={handler}
          >
            <Icon />
          </IconButton>
        ))}

        <div>
          <Tooltip title={profile.username}>
            <IconButton color='inherit'>
              <ProfileIcon />
            </IconButton>
          </Tooltip>
        </div>

        {/* Menu Button */}
        {menuItems.length > 0 && (
          <IconButton
            color='inherit'
            aria-label='More'
            aria-haspopup='true'
            onClick={handleMenuClick}
          >
            <MoreIcon />
          </IconButton>
        )}
      </Toolbar>

      {/* Menu */}
      <Menu
        open={!!menuTarget}
        anchorEl={menuTarget}
        onClose={handleMenuClose}
        disableAutoFocusItem
        PaperProps={{
          style: {
            maxHeight: 48 * 5.5,
            width: 200
          }
        }}
      >
        {menuItems.map(({ key, label, handler }) => (
          <MenuItem key={key} onClick={handleMenuItemClick(handler)}>{label}</MenuItem>
        ))}
      </Menu>

      {
        dialogs.map(({ key, dialog }) => <Fragment key={key}>{dialog}</Fragment>)
      }
    </MuiAppBar>
  );
};

export default AppBar;
