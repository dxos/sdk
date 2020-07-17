//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { makeStyles } from '@material-ui/core';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';

import BuildIcon from '@material-ui/icons/Build';

import { EditableText } from '@dxos/react-ux';

const useStyles = makeStyles(theme => ({
  title: {
    marginLeft: theme.spacing(2)
  },
  table: {
    minWidth: 650,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2)
  },
  tableContainer: {
    maxHeight: 250,
    paddingRight: 20
  },
  expand: {
    display: 'flex',
    flex: 1
  },
  label: {
    fontVariant: 'all-small-caps'
  },
  settingItem: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2)
  }
}));

const ViewSettingsDialog = ({ open, onClose, viewModel, viewId, pads }) => {
  const classes = useStyles();
  const item = viewModel.getById(viewId);

  const pad = item ? pads.find(pad => pad.type === item.type) : undefined;

  return (
    <Dialog open={open} maxWidth='md' onClose={onClose}>
      <DialogTitle>
        <Toolbar variant='dense' disableGutters>
          <Avatar>
            <BuildIcon />
          </Avatar>

          <Typography variant='h5' className={classes.title}>View Settings</Typography>
        </Toolbar>
      </DialogTitle>

      <DialogContent>
        {item && (
          <EditableText
            fullWidth
            label='Name'
            variant='outlined'
            value={item.displayName}
            className={classes.settingItem}
            onUpdate={value => viewModel.renameView(viewId, value)}
          />
        )}
        {pad && (
          <TextField
            fullWidth
            disabled
            label='Type'
            variant='outlined'
            value={pad.displayName}
            className={classes.settingItem}
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color='primary'>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ViewSettingsDialog;
