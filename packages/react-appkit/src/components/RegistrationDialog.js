//
// Copyright 2020 DXOS.org
//

import MobileDetect from 'mobile-detect';
import React, { useRef, useState } from 'react';

import { withStyles } from '@material-ui/core';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import Chip from '@material-ui/core/Chip';
import Dialog from '@material-ui/core/Dialog';
import MuiDialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Grid from '@material-ui/core/Grid';
import LinearProgress from '@material-ui/core/LinearProgress';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import CreateIcon from '@material-ui/icons/AddCircleOutline';
import RestoreIcon from '@material-ui/icons/Restore';

import { generateSeedPhrase } from '@dxos/credentials';

const STAGE_PENDING = -1;
const STAGE_START = 0;
const STAGE_RESTORE = 1;
const STAGE_ENTER_USERNAME = 2;
const STAGE_SHOW_SEED_PHRASE = 3;
const STAGE_CHECK_SEED_PHRASE = 4;

// TODO(burdon): Factor out.
const ordinal = n => String(n) + ((n === 1) ? 'st' : (n === 2) ? 'nd' : (n === 3) ? 'rd' : 'th');

// TODO(burdon): Factor out.
const mobile = new MobileDetect(window.navigator.userAgent).mobile();

const useStyles = makeStyles((theme) => ({
  paper: {
    minWidth: 700,
    minHeight: 300
  },

  container: {
    display: 'flex',
    flex: 1,
    justifyContent: 'space-between'
  },

  choice: {
    width: 300,
    height: 240,
    margin: theme.spacing(1),
    padding: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  },

  icon: {
    margin: theme.spacing(2),
    fontSize: 'xx-large'
  },

  caption: {
    textAlign: 'center',
    marginBottom: theme.spacing(4)
  },

  seedPhraseActions: {
    justifyContent: 'space-between'
  },

  seedPhrase: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(3)
  },
  seedChip: {
    width: 128,
    justifyContent: 'inherit',
    margin: theme.spacing(0.5)
  },
  seedLabel: {
    paddingLeft: theme.spacing(1)
  },
  seedNumber: {
    margin: 0,
    fontSize: 11,
    height: 24,
    width: 24,
    marginLeft: 5,
    backgroundColor: theme.palette.primary.dark,
    color: 'white'
  }
}));

const DialogActions = withStyles(theme => ({
  root: {
    padding: theme.spacing(2)
  }
}))(MuiDialogActions);

/**
 * Registration and recovery dialog.
 */
const RegistrationDialog = ({ open = true, debug = false, onFinish }) => {
  const classes = useStyles();
  const [stage, setStage] = useState(STAGE_START);
  const [seedPhrase] = useState(generateSeedPhrase());
  const [username, setUsername] = useState('');

  const words = seedPhrase.split(' ');
  const selected = [Math.floor(Math.random() * words.length), Math.floor(Math.random() * words.length)];
  while (selected[0] === selected[1]) {
    selected[1] = Math.floor(Math.random() * words.length);
  }
  selected.sort((a, b) => (a < b ? -1 : a === b ? 0 : 1));

  const usernameRef = useRef();
  const seedPhraseRef = useRef();

  const handleDownloadSeedPhrase = (seedPhrase) => {
    const file = new Blob([seedPhrase], { type: 'text/plain' });
    const element = document.createElement('a');
    element.href = URL.createObjectURL(file);
    element.download = 'dxos-recovery-seedphrase.txt';
    element.click();
  };

  const handleNext = async (ev) => {
    switch (stage) {
      case STAGE_ENTER_USERNAME: {
        if (usernameRef.current.value.trim().length > 0) {
          setUsername(usernameRef.current.value.trim());
          setStage(STAGE_SHOW_SEED_PHRASE);
        }
        break;
      }

      case STAGE_SHOW_SEED_PHRASE: {
        setStage(STAGE_CHECK_SEED_PHRASE);
        break;
      }

      case STAGE_CHECK_SEED_PHRASE: {
        const testWords = seedPhraseRef.current.value.trim().toLowerCase().split(/\s+/);

        const match = (testWords.length === 2 &&
          testWords[0] === words[selected[0]] && testWords[1] === words[selected[1]]);

        const skipMatch = (debug || ev.shiftKey || !!mobile);

        // TODO(burdon): Decide policy.
        if (match || skipMatch) {
          setStage(STAGE_PENDING);
          await onFinish(username, seedPhrase);
        } else {
          setStage(STAGE_SHOW_SEED_PHRASE);
        }
        break;
      }

      case STAGE_RESTORE: {
        const restoreSeedPhrase = seedPhraseRef.current.value.trim().toLowerCase();

        // Sanity check that it looks like a seed phrase.
        if (restoreSeedPhrase.split(/\s+/g).length !== 12) {
          // TODO(burdon): Report invalid input to user.
          console.log('Invalid seed phrase: ', restoreSeedPhrase);
        } else {
          // TODO(dboreham): Do more checks on input (not all strings containing 12 words are valid seed phrases).
          setStage(STAGE_PENDING);
          await onFinish(username, restoreSeedPhrase);
        }
        break;
      }

      default:
        setStage(STAGE_ENTER_USERNAME);
    }
  };

  const handleKeyDown = async (event) => {
    if (event.key === 'Enter') {
      await handleNext(event);
    }
  };

  const SeedPhrasePanel = ({ value }) => {
    const words = value.split(' ');

    return (
      <Grid container className={classes.seedPhrase} spacing={0}>
        {words.map((word, i) => (
          <Grid item key={i} xs={3}>
            <Chip
              key={i}
              icon={<Avatar className={classes.seedNumber}>{i + 1}</Avatar>}
              classes={{ root: classes.seedChip, label: classes.seedLabel }}
              label={word}
            />
          </Grid>
        ))}
      </Grid>
    );
  };

  // TODO(burdon): Configure title.
  const getStage = stage => {
    // eslint-disable-next-line default-case
    switch (stage) {
      case STAGE_START: {
        return (
          <>
            <DialogTitle>User Profile</DialogTitle>
            <DialogContent className={classes.container}>
              <div>
                <Paper className={classes.choice} variant='outlined'>
                  <CreateIcon className={classes.icon} />
                  <Typography className={classes.caption}>
                    Create a new profile<br />and wallet.
                  </Typography>
                  <Button variant='contained' color='primary' onClick={() => setStage(STAGE_ENTER_USERNAME)}>
                    Create Wallet
                  </Button>
                </Paper>
              </div>
              <div>
                <Paper className={classes.choice} variant='outlined'>
                  <RestoreIcon className={classes.icon} />
                  <Typography className={classes.caption}>
                    Enter your seed phrase<br />to recover your profile.
                  </Typography>
                  <Button variant='contained' color='primary' onClick={() => setStage(STAGE_RESTORE)}>
                    Recover Wallet
                  </Button>
                </Paper>
              </div>
            </DialogContent>
            <DialogActions />
          </>
        );
      }

      case STAGE_RESTORE: {
        return (
          <>
            <DialogTitle>Restoring your Wallet</DialogTitle>
            <DialogContent>
              <DialogContentText>Enter the seed phrase.</DialogContentText>
              <TextField autoFocus fullWidth spellCheck={false} inputRef={seedPhraseRef} onKeyDown={handleKeyDown} />
            </DialogContent>
            <DialogActions>
              <Button color='primary' onClick={() => setStage(STAGE_START)}>Back</Button>
              <Button variant='contained' color='primary' onClick={handleNext}>Restore</Button>
            </DialogActions>
          </>
        );
      }

      case STAGE_ENTER_USERNAME: {
        return (
          <>
            <DialogTitle>Create your Identity</DialogTitle>
            <DialogContent>
              <DialogContentText>Enter a username.</DialogContentText>
              <TextField autoFocus fullWidth spellCheck={false} inputRef={usernameRef} onKeyDown={handleKeyDown} />
            </DialogContent>
            <DialogActions>
              <Button color='primary' onClick={() => setStage(STAGE_START)}>Back</Button>
              <Button variant='contained' color='primary' onClick={handleNext}>Next</Button>
            </DialogActions>
          </>
        );
      }

      case STAGE_SHOW_SEED_PHRASE: {
        return (
          <>
            <DialogTitle>Seed Phrase</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Your recovery seed phrase consists of the twelve words below.
                <br />
                You will need to enter the seed phrase if you ever need to recover your wallet.
              </DialogContentText>
              <SeedPhrasePanel value={seedPhrase} />
              <DialogContentText>
                <b>NEVER</b> share your recovery seed phrase with anyone.
              </DialogContentText>
            </DialogContent>
            <DialogActions className={classes.seedPhraseActions}>
              <div>
                <Button onClick={() => handleDownloadSeedPhrase(seedPhrase)}>Download</Button>
              </div>
              <div>
                <Button color='primary' onClick={() => setStage(STAGE_ENTER_USERNAME)}>Back</Button>
                <Button variant='contained' color='primary' onClick={handleNext}>Next</Button>
              </div>
            </DialogActions>
          </>
        );
      }

      case STAGE_CHECK_SEED_PHRASE: {
        return (
          <>
            <DialogTitle>Verify The Seed Phrase</DialogTitle>
            <DialogContent>
              <DialogContentText>
                You will need to enter the seed phrase if you ever need to recover your wallet.
              </DialogContentText>
              <DialogContentText>
                {`Enter the ${ordinal(selected[0] + 1)} and ${ordinal(selected[1] + 1)} words.`}
              </DialogContentText>
              <TextField autoFocus fullWidth spellCheck={false} inputRef={seedPhraseRef} onKeyDown={handleKeyDown} />
            </DialogContent>
            <DialogActions>
              <Button color='primary' onClick={() => setStage(STAGE_ENTER_USERNAME)}>Back</Button>
              <Button variant='contained' color='primary' onClick={handleNext}>Finish</Button>
            </DialogActions>
          </>
        );
      }

      case STAGE_PENDING: {
        return (
          <>
            <DialogTitle>Initializing...</DialogTitle>
            <DialogContent>
              <LinearProgress />
            </DialogContent>
          </>
        );
      }
    }
  };

  return (
    <Dialog open={open} maxWidth='sm' classes={{ paper: classes.paper }}>
      {getStage(stage)}
    </Dialog>
  );
};

export default RegistrationDialog;
