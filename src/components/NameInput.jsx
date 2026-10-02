import { forwardRef } from 'react';
import { TextInput } from 'react-native';
import { filterNameInput } from '../utils/validation';

// Applies equally to typing and pasted text on web, Android and iOS.
export default forwardRef(function NameInput({ onChangeText, ...props }, ref) {
  return <TextInput {...props} ref={ref} onChangeText={value => onChangeText?.(filterNameInput(value))} />;
});
