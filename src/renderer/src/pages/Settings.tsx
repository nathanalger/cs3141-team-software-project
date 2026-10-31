import { Alert, Box, CircularProgress, Divider, Typography } from '@mui/joy';
import { useEffect } from 'react';
import { getSettingKey, SETTINGS_SCHEMA } from '../../../types/settings';
import PageWrapper from '../architecture/PageWrapper';
import { useSettings } from '../hooks/useSettings';
import { useParams } from 'react-router-dom';
import OptionSelection from '../components/OptionSelection';
import OptionGroup from '../components/OptionGroup';
import Section from '../components/Section';
import { useLocation, useNavigate } from 'react-router-dom';
import SettingControl from '../components/SettingControl';
import AccountSettings from './AccountSettings';

const AllSettings = () => {
   const navigate = useNavigate();

   return (
      <Box
         sx={{
            display: 'flex',
            gap: 2,
            flexDirection: 'column',
         }}
      >
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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                           {setting.type === 'debug-button' ? (
                              <SettingControl setting={setting} />
                           ) : (
                              <SettingControl
                                 setting={setting}
                                 value={values[key] ?? setting.defaultValue}
                                 onChange={(newValue) => void setSetting(key, newValue)}
                              />
                           )}
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
      content = <CircularProgress />;
   } else if (categoryName && !category) {
      // Display an error (too lazy for this rn)
   } else if (category) {
      content =
         category.name === 'accounts' ? (
            <AccountSettings subcategoryName={subcategoryName} />
         ) : (
            <ViewCategory category={category} subcategoryName={subcategoryName} />
         );
   } else {
      content = <AllSettings />;
   }

   return (
      <PageWrapper sx={{ height: '100%', overflowY: 'auto' }}>
         <Section sx={{ p: 2, flexShrink: 0 }}>
            <Typography level="h2">{category?.displayName ?? 'Settings'}</Typography>
            <Typography level="body-sm">{category?.description ?? 'Manage your preferences.'}</Typography>
         </Section>

         {error && <Alert color="danger">{`Could not load or save settings: ${error}`}</Alert>}
         {content}
      </PageWrapper>
   );
};

export default SettingsPage;
