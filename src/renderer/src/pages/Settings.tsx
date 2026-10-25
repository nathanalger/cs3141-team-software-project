import { Alert, Box, CircularProgress, Divider, Input, Switch, Typography } from '@mui/joy';
import { useEffect, useState } from 'react';
import { getSettingKey, SETTINGS_SCHEMA, type SettingDefinition } from '../../../types/settings';
import PageWrapper from '../architecture/PageWrapper';
import { useSettings } from '../hooks/useSettings';
import { useParams } from 'react-router-dom';
import OptionSelection from '../components/OptionSelection';
import OptionGroup from '../components/OptionGroup';
import Section from '../components/Section';
import { useLocation, useNavigate } from 'react-router-dom';

const SettingControl = ({
   setting,
   value,
   onChange,
}: {
   setting: SettingDefinition;
   value: string | boolean | number;
   onChange: (value: string | boolean | number) => void;
}) => {
   const [draft, setDraft] = useState(String(value));
   const [validationError, setValidationError] = useState<string>();

   useEffect(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(String(value));
   }, [value]);

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

const AllSettings = () => {
   const navigate = useNavigate();

   return (
      <Box>
         {SETTINGS_SCHEMA.map((category) => (
            <Section key={category.name} sx={{ textDecoration: 'none' }}>
               <Box sx={{ pb: 2, pt: 1 }}>
                  <Typography level="h3">{category.displayName}</Typography>
                  <Typography level="body-sm">{category.description}</Typography>
               </Box>
               <Divider />
               <OptionGroup sx={{ my: 1 }}>
                  {category.subcategories.map((subcategory) => (
                     <OptionSelection
                        key={subcategory.name}
                        onClick={() => navigate(`/settings/${category.name}#${subcategory.name}`)}
                     >
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                           <Typography level="title-md">{subcategory.displayName}</Typography>
                           <Typography level="body-sm">{subcategory.description}</Typography>
                        </Box>
                     </OptionSelection>
                  ))}
               </OptionGroup>
            </Section>
         ))}
      </Box>
   );
};

const ViewCategory = ({
   category,
   subcategoryName,
}: {
   category: (typeof SETTINGS_SCHEMA)[number];
   subcategoryName?: string;
}) => {
   const { values, setSetting } = useSettings();
   const { hash } = useLocation();
   const subcategories = category.subcategories.filter(
      (subcategory) => !subcategoryName || subcategory.name === subcategoryName,
   );

   useEffect(() => {
      if (!hash) return;

      document.getElementById(hash.slice(1))?.scrollIntoView({
         behavior: 'smooth',
         block: 'start',
      });
   }, [category.name, hash, subcategoryName]);

   return (
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
         {subcategories.map((subcategory) => (
            <Section
               key={subcategory.name}
               id={subcategory.name}
               sx={{
                  scrollMarginTop: 16,
                  borderColor: hash === `#${subcategory.name}` ? 'primary.500' : undefined,
               }}
            >
               <Box sx={{ pt: 1, pb: 2 }}>
                  <Typography level="h3">{subcategory.displayName}</Typography>
                  <Typography level="body-sm">{subcategory.description}</Typography>
               </Box>

               {subcategory.settings.map((setting) => {
                  const key = getSettingKey(category.name, subcategory.name, setting.name);
                  const value = values[key] ?? setting.defaultValue;

                  return (
                     <Box
                        key={setting.name}
                        sx={{
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'space-between',
                           gap: 2,
                           py: 1,
                           borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                        }}
                     >
                        <Box sx={{ p: 1 }}>
                           <Typography level="title-sm">{setting.displayName}</Typography>
                           <Typography level="body-sm">{setting.description}</Typography>
                        </Box>
                        <Box sx={{ pr: 1 }}>
                           <SettingControl
                              setting={setting}
                              value={value}
                              onChange={(newValue) => void setSetting(key, newValue)}
                           />
                        </Box>
                     </Box>
                  );
               })}
            </Section>
         ))}
      </Box>
   );
};

const SettingsPage = () => {
   const { loading, error } = useSettings();
   const { category: categoryName, subcategory: subcategoryName } = useParams();
   const category = SETTINGS_SCHEMA.find((item) => item.name === categoryName);

   let content;
   if (loading) {
      content = <CircularProgress aria-label="Loading settings" />;
   } else if (categoryName && !category) {
      // Display an error (too lazy for this rn)
   } else if (category) {
      content = <ViewCategory category={category} subcategoryName={subcategoryName} />;
   } else {
      content = <AllSettings />;
   }

   return (
      <PageWrapper sx={{ height: '100%', overflowY: 'auto' }}>
         <Section sx={{ p: 2 }}>
            <Typography level="h2">{category?.displayName ?? 'Settings'}</Typography>
            <Typography level="body-sm">{category?.description ?? 'Manage your preferences.'}</Typography>
         </Section>

         {error && <Alert color="danger">{`Could not load or save settings: ${error}`}</Alert>}
         {content}
      </PageWrapper>
   );
};

export default SettingsPage;
