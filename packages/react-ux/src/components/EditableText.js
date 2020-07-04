//
// Copyright 2020 DXOS.org
//

import clsx from 'clsx';
import React, { useEffect, useState } from 'react';

import { makeStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';

const useStyles = makeStyles(theme => ({
  text: {
    letterSpacing: 'normal',
    color: 'inherit',
    overflow: 'hidden',
    textOverflow: 'ellipses',
    whiteSpace: 'nowrap'
  },

  placeholder: {},

  editing: {
    '& > .MuiInput-input': {
      padding: 0
    }
  },

  editable: ({ variant }) => {
    return theme.typography[variant];
  }
}));

/**
 * Editable text field.
 */
const EditableText = ({ value, disabled = false, variant = 'body1', classes: clazzes = {}, onUpdate }) => {
  const classes = useStyles({ variant });
  const [editable, setEditable] = useState(false);
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  const handleUpdate = newValue => {
    if (newValue !== value) {
      onUpdate(newValue);
    }
  };

  const handleChange = ({ target: { value } }) => {
    setText(value);
  };

  const handleKeyDown = ({ target: { value }, key }) => {
    switch (key) {
      case 'Enter': {
        setText(value);
        setEditable(false);
        handleUpdate(value);
        break;
      }

      case 'Escape': {
        setEditable(false);
        break;
      }

      default:
    }
  };

  const handleBlur = ({ target: { value } }) => {
    setText(value);
    setEditable(false);
    handleUpdate(value);
  };

  if (editable) {
    return (
      <TextField
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        autoFocus
        fullWidth
        InputProps={{
          disableUnderline: true,
          classes: { root: clsx(classes.text, classes.editable, classes.editing, clazzes.root) },
          inputProps: {
            spellCheck: false
          }
        }}
      />
    );
  }

  return (
    <Typography
      classes={{ root: clsx(classes.text, !text && classes.placeholder, clazzes.root) }}
      variant={variant}
      onClick={disabled ? null : () => setEditable(true)}
    >
      {text}
    </Typography>
  );
};

export default EditableText;
