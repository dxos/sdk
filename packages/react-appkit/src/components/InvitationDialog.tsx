//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';

import { Button, DialogActions } from '@material-ui/core';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import IconButton from '@material-ui/core/IconButton';
import Popover from '@material-ui/core/Popover';
import TextField from '@material-ui/core/TextField';
import { makeStyles } from '@material-ui/core/styles';
import LinkIcon from '@material-ui/icons/Link';

import { Passcode } from '@dxos/react-ux';

const useStyles = makeStyles((theme) => ({
  root: {
    width: 500
  },

  paper: {
    minWidth: 500
  },

  secret: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2)
  },

  link: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center'
  },

  input: {
    display: 'flex',
    flex: 1,
    marginRight: theme.spacing(2)
  }
}));

type InvitationDialogPropsType = {
  link: string,
  title: string,
  message: string,
  passcode: string,
  anchorEl: Element,
  open: boolean,
  onClose: () => void
}

const InvitationDialog = ({ link, title, message, passcode, anchorEl, open, onClose }: InvitationDialogPropsType) => {
  const classes = useStyles();

  if (anchorEl) {
    return (
      <Popover
        anchorEl={() => anchorEl}
        open={!!anchorEl}
        onClose={() => onClose()}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
      >
        <InvitationContent link={link} title={title} message={message} passcode={passcode} />
      </Popover>
    );
  }

  if (open) {
    return (
      <Dialog open={open} classes={{ paper: classes.paper }}>
        <InvitationContent link={link} title={title} message={message} passcode={passcode} onClose={onClose} />
      </Dialog>
    );
  }

  return null;
};

const InvitationContent = ({
  link,
  title,
  message,
  passcode,
  onClose
}: {
  link: string,
  title: string,
  message: string,
  passcode: string,
  onClose?: () => void
}) => {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <DialogTitle>{title}</DialogTitle>

      <DialogContent>
        {message && (
          <DialogContentText>{message}</DialogContentText>
        )}

        <div className={classes.secret}>
          <Passcode value={passcode} />
        </div>

        <div className={classes.link}>
          <TextField className={classes.input} value={link || ''} disabled />

          <CopyToClipboard text={link} onCopy={(value: string) => console.log(value)}>
            <IconButton
              color='inherit'
              aria-label='copy to clipboard'
              title='Copy to clipboard'
              edge='start'
            >
              <LinkIcon />
            </IconButton>
          </CopyToClipboard>
        </div>

        <DialogActions>
          <Button onClick={onClose} color='primary'>
            Done
          </Button>
        </DialogActions>
      </DialogContent>
    </div>
  );
};

export default InvitationDialog;
