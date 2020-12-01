//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import LinearProgress from '@material-ui/core/LinearProgress';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import Alert from '@material-ui/lab/Alert';

import { useInvitationRedeemer } from '@dxos/react-client';

const useStyles = makeStyles(theme => ({
  marginTop: {
    marginTop: theme.spacing(2)
  }
}));

const RedeemDialog = ({ onClose, ...props }) => {
  const classes = useStyles();
  const [isOffline, setIsOffline] = useState(false);

  const handleDone = () => {
    setStep(0);
    setInvitationCode('');
    setPinCode('');
    setIsProcessing(false);
    onClose();
  };

  const [redeemCode, setPin] = useInvitationRedeemer({
    onDone: handleDone,
    onError: (ex) => {
      setStep(2);
      setError(String(ex));
    },
    isOffline
  });

  const [error, setError] = useState(undefined);
  const [step, setStep] = useState(0); // TODO(burdon): Const.
  const [invitationCode, setInvitationCode] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleEnterInvitationCode = async () => {
    redeemCode(invitationCode);
    setStep(1);
  };

  const handleEnterPinCode = async () => {
    setIsProcessing(true);
    setPin(pinCode);
  };

  return (
    <Dialog fullWidth maxWidth='xs' open onClose={handleDone} {...props}>
      <DialogTitle>Redeem Invitation</DialogTitle>

      {step === 0 && (
        <>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              multiline
              placeholder="Paste invitation code."
              spellCheck={false}
              value={invitationCode}
              onChange={(event) => setInvitationCode(event.target.value)}
              rows={6}
            />
            <FormControlLabel
              className={classes.marginTop}
              control={<Checkbox checked={isOffline} onChange={event => setIsOffline(event.target.checked)}/>}
              label="Offline"
            />
          </DialogContent>
          <DialogActions>
            <Button color='secondary' onClick={handleDone}>Cancel</Button>
            <Button
              color='primary'
              onClick={handleEnterInvitationCode}
              disabled={isProcessing}>
              Submit
            </Button>
          </DialogActions>
        </>
      )}

      {step === 1 && setPin && (
        <>
          <DialogContent>
            <Typography variant='body1' gutterBottom>
              Enter the PIN number.
            </Typography>
            <TextField
              value={pinCode}
              onChange={(event) => setPinCode(event.target.value)}
              variant='outlined'
              margin='normal'
              required
              fullWidth
              label='PIN Code'
              autoFocus
              disabled={isProcessing}
            />
            {isProcessing && <LinearProgress/>}
          </DialogContent>
          <DialogActions>
            <Button color='secondary' onClick={handleDone}>Cancel</Button>
            <Button
              color='primary'
              onClick={handleEnterPinCode}
              disabled={isProcessing}>
              Submit
            </Button>
          </DialogActions>
        </>
      )}

      {step === 1 && !setPin && (
        <DialogContent>
          <LinearProgress />
          <Typography className={classes.marginTop} variant='body1' gutterBottom>
            Processing...
          </Typography>
        </DialogContent>
      )}

      {step === 2 && error && (
        <DialogContent>
          <Alert severity="error">{error}</Alert>
          <DialogActions>
            <Button autoFocus color='secondary' onClick={handleDone}>Cancel</Button>
          </DialogActions>
        </DialogContent>
      )}
    </Dialog>
  );
};

export default RedeemDialog;
