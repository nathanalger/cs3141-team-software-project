import { Alert, Box, Button, Input, Switch, Typography } from '@mui/joy';
import { useEffect, useState } from 'react';
import {
   DEFAULT_PRIMARY_COLOR,
   isValidHexColor,
   type ColorSetting,
   type DebugButtonSetting,
   type PersistedSettingDefinition,
} from '../../../types/settings';

const DebugButtonControl = ({ setting }: { setting: DebugButtonSetting }) => {
   const [loading, setLoading] = useState(false);
   const [result, setResult] = useState<string>();
   const [error, setError] = useState<string>();

   const runAction = async () => {
      setLoading(true);
      setResult(undefined);
      setError(undefined);

      try {
         const actionResult = await setting.action();
         if (actionResult === undefined) {
            setResult('Function completed successfully.');
         } else if (typeof actionResult === 'string') {
            setResult(actionResult);
         } else {
            const serializedResult = JSON.stringify(actionResult, null, 2);
            setResult(serializedResult ?? String(actionResult));
         }
      } catch (actionError) {
         setError(
            actionError instanceof Error ? actionError.message : 'An unexpected error occurred.',
         );
      } finally {
         setLoading(false);
      }
   };

   return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
         <Button onClick={() => void runAction()} loading={loading} disabled={loading}>
            {setting.buttonLabel}
         </Button>
         {error && (
            <Alert color="danger" role="alert">
               {error}
            </Alert>
         )}
         {result && (
            <Alert color="neutral" role="status">
               <Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {result}
               </Box>
            </Alert>
         )}
      </Box>
   );
};

const ColorSettingControl = ({
   setting,
   value,
   onChange,
}: {
   setting: ColorSetting;
   value: string;
   onChange: (value: string) => void;
}) => {
   const [draft, setDraft] = useState(value);
   const [validationError, setValidationError] = useState<string>();

   useEffect(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(value);
   }, [value]);

   const commitDraft = () => {
      if (isValidHexColor(draft)) {
         const normalizedColor = draft.toUpperCase();
         setDraft(normalizedColor);
         setValidationError(undefined);
         onChange(normalizedColor);
         return;
      }

      setDraft(DEFAULT_PRIMARY_COLOR);
      setValidationError('Use # followed by six hexadecimal digits. The default blue was restored.');
      onChange(setting.defaultValue);
   };

   return (
      <Box>
         <Input
            type="text"
            startDecorator={
               <Box
                  sx={{
                     height: 14,
                     width: 14,
                     borderRadius: '50%',
                     border: (t) => `1px solid ${t.palette.divider}`,
                     bgcolor: draft ?? DEFAULT_PRIMARY_COLOR,
                  }}
               />
            }
            value={draft}
            placeholder={setting.defaultValue}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
               if (event.key === 'Enter') event.currentTarget.blur();
            }}
            aria-label={setting.displayName}
            slotProps={{ input: { maxLength: 7 } }}
         />
         {validationError && (
            <Typography color="danger" level="body-xs" sx={{ mt: 0.5 }}>
               {validationError}
            </Typography>
         )}
      </Box>
   );
};

const PersistedSettingControl = ({
   setting,
   value,
   onChange,
}: {
   setting: PersistedSettingDefinition;
   value: string | boolean | number;
   onChange: (value: string | boolean | number) => void;
}) => {
   const [draft, setDraft] = useState(String(value));
   const [validationError, setValidationError] = useState<string>();

   useEffect(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(String(value));
   }, [value]);

   if (setting.type === 'color') {
      return <ColorSettingControl setting={setting} value={String(value)} onChange={onChange} />;
   }

   if (setting.type === 'boolean') {
      return <Switch checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />;
   }

   const commitDraft = () => {
      if (setting.type === 'text') {
         onChange(draft);
         return;
      }

      const numberValue = Number(draft);
      if (
         !draft.trim() ||
         !Number.isFinite(numberValue) ||
         (setting.min !== undefined && numberValue < setting.min) ||
         (setting.max !== undefined && numberValue > setting.max)
      ) {
         setValidationError(
            `Enter a number${setting.min === undefined ? '' : ` of at least ${setting.min}`}${
               setting.max === undefined ? '' : ` and at most ${setting.max}`
            }.`,
         );
         setDraft(String(value));
         return;
      }

      setValidationError(undefined);
      onChange(numberValue);
   };

   return (
      <Box>
         <Input
            type={setting.type}
            value={draft}
            placeholder={setting.type === 'text' ? setting.placeholder : undefined}
            slotProps={{
               input:
                  setting.type === 'number' ? { min: setting.min, max: setting.max, step: setting.step } : undefined,
            }}
            onChange={(event) => {
               setDraft(event.target.value);
               setValidationError(undefined);
            }}
            onBlur={commitDraft}
            onKeyDown={(event) => {
               if (event.key === 'Enter') event.currentTarget.blur();
            }}
            aria-label={setting.displayName}
         />
         {validationError && (
            <Typography color="danger" level="body-xs" sx={{ mt: 0.5 }}>
               {validationError}
            </Typography>
         )}
      </Box>
   );
};

const SettingControl = (
   props:
      | {
           setting: DebugButtonSetting;
           value?: never;
           onChange?: never;
        }
      | {
           setting: PersistedSettingDefinition;
           value: string | boolean | number;
           onChange: (value: string | boolean | number) => void;
        },
) => {
   if (props.setting.type === 'debug-button') {
      return <DebugButtonControl setting={props.setting} />;
   }

   if (!('value' in props) || props.value === undefined || !('onChange' in props) || !props.onChange) {
      throw new Error('Persisted setting controls require a value and change handler.');
   }

   return (
      <PersistedSettingControl
         setting={props.setting}
         value={props.value}
         onChange={props.onChange}
      />
   );
};

export default SettingControl;
