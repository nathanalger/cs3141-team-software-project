import {Alert, Box, Button, Card, Divider, Typography,} from '@mui/joy';
import { useState } from 'react';
import type { MailConnectionResult } from '../../../shared/email';
import PageWrapper from '../architecture/PageWrapper';
import { useSettings } from '../hooks/useSettings';
import { useParams } from 'react-router-dom';
import OptionSelection from '../components/OptionSelection';
import OptionGroup from '../components/OptionGroup';
import Section from '../components/Section';
import { useLocation, useNavigate } from 'react-router-dom';
import SettingControl from '../components/SettingControl';

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
   const [testing, setTesting] = useState(false);
   const [result, setResult] =
      useState<MailConnectionResult | null>(null);
   const [unexpectedError, setUnexpectedError] =
      useState<string | null>(null);

   const testConnections = async () => {
      setTesting(true);
      setResult(null);
      setUnexpectedError(null);

      try {
         if (!window.desktop?.testMailConnections) {
            throw new Error(
               'The desktop connection-test API is unavailable. Restart the Electron app after installing the update.',
            );
         }

         const connectionResult =
            await window.desktop.testMailConnections();

         setResult(connectionResult);
      } catch (error) {
         setUnexpectedError(
            error instanceof Error
               ? error.message
               : 'An unexpected error occurred.',
         );
      } finally {
         setTesting(false);
      }
   };

   return (
      <PageWrapper>
         <Box
            sx={{
               display: 'flex',
               flexDirection: 'column',
               gap: 2,
               maxWidth: 760,
            }}
         >
            <Typography level="h2">Settings</Typography>

            <Card variant="outlined" sx={{ gap: 1.5 }}>
               <Typography level="h3">
                  Mail server connections
               </Typography>

               <Typography level="body-md">
                  Test authenticated TLS connections to the configured
                  IMAP and SMTP test servers. This checks connectivity
                  only; it does not send an email.
               </Typography>

               <Typography
                  level="body-sm"
                  sx={{ color: 'text.secondary' }}
               >
                  Configure server hostnames and credentials through
                  the environment variables documented in
                  getting-started.md. Passwords are not entered into
                  or exposed by this page.
               </Typography>

               <Box>
                  <Button
                     onClick={() => void testConnections()}
                     loading={testing}
                     disabled={testing}
                  >
                     {testing
                        ? 'Testing connections…'
                        : 'Test IMAP and SMTP connections'}
                  </Button>
               </Box>

               {unexpectedError && (
                  <Alert color="danger" role="alert">
                     {unexpectedError}
                  </Alert>
               )}

               {result && (
                  <Box
                     sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                     }}
                  >
                     <Alert
                        color={result.success ? 'success' : 'warning'}
                     >
                        {result.success
                           ? 'Both mail server connections succeeded.'
                           : 'One or more mail server connections failed.'}
                     </Alert>

                     {result.results.map((item) => (
                        <Box
                           key={item.service}
                           sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 0.25,
                              p: 1.25,
                              borderRadius: 'sm',
                              bgcolor: 'background.level1',
                           }}
                        >
                           <Typography level="title-sm">
                              {item.service}:{' '}
                              {item.success
                                 ? 'Connected securely'
                                 : 'Connection failed'}
                           </Typography>

                           <Typography
                              level="body-sm"
                              sx={{ overflowWrap: 'anywhere' }}
                           >
                              {item.message}
                           </Typography>
                        </Box>
                     ))}
                  </Box>
               )}

               <Divider />

               <Typography
                  level="body-xs"
                  sx={{ color: 'text.tertiary' }}
               >
                  TLS certificate verification is enabled. IMAP uses
                  TLS on its configured port (default 993). SMTP uses
                  implicit TLS on port 465 or requires STARTTLS on
                  other configured ports (default 587).
               </Typography>
            </Card>
         </Box>
      </PageWrapper>
   );
};

export default SettingsPage;
