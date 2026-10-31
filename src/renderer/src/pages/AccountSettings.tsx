import { Alert, Box, Button, Checkbox, CircularProgress, Divider, Input, Option, Select, Typography } from '@mui/joy';
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Delete from '@mui/icons-material/Delete';
import Star from '@mui/icons-material/Star';
import StarBorder from '@mui/icons-material/StarBorder';
import type { Account, AccountInput, AccountUpdateInput, MailSecurity } from '../../../shared/email';
import Section from '../components/Section';
import OptionGroup from '../components/OptionGroup';
import OptionSelection from '../components/OptionSelection';
import { SETTINGS_SCHEMA } from '../../../types/settings';
import { useLocation } from 'react-router-dom';
import CookieButton from '../components/CookieButton';
import AppModal from '../components/AppModal';

type AccountForm = {
   fName: string;
   lName: string;
   displayName: string;
   email: string;
   imapHost: string;
   imapPort: string;
   imapSecurity: MailSecurity;
   imapUser: string;
   imapPassword: string;
   smtpHost: string;
   smtpPort: string;
   smtpSecurity: MailSecurity;
   smtpUser: string;
   smtpPassword: string;
   isDefault: boolean;
};

const EMPTY_FORM: AccountForm = {
   fName: '',
   lName: '',
   displayName: '',
   email: '',
   imapHost: '',
   imapPort: '993',
   imapSecurity: 'tls',
   imapUser: '',
   imapPassword: '',
   smtpHost: '',
   smtpPort: '587',
   smtpSecurity: 'starttls',
   smtpUser: '',
   smtpPassword: '',
   isDefault: false,
};

function errorText(error: unknown): string {
   return error instanceof Error ? error.message : 'An unexpected error occurred.';
}

function Field({ label, children }: { label: string; children: ReactNode }) {
   return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
         <Typography level="title-sm">{label}</Typography>
         {children}
      </Box>
   );
}

const AccountSettings = ({ subcategoryName }: { subcategoryName?: string }) => {
   const { hash } = useLocation();
   const [accounts, setAccounts] = useState<Account[]>([]);
   const [form, setForm] = useState<AccountForm>(EMPTY_FORM);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [removingAccountID, setRemovingAccountID] = useState<number>();
   const [defaultingAccountID, setDefaultingAccountID] = useState<number>();
   const [accountToRemove, setAccountToRemove] = useState<Account>();
   const [error, setError] = useState<string>();
   const [notice, setNotice] = useState<string>();
   const category = SETTINGS_SCHEMA.find((item) => item.name === 'accounts');

   if (!category) throw new Error('The Accounts settings category is missing from the settings schema.');

   const subcategories = category.subcategories.filter(
      (subcategory) => !subcategoryName || subcategory.name === subcategoryName,
   );

   const refreshAccounts = useCallback(async () => {
      setAccounts(await window.desktop.getAccounts());
   }, []);

   useEffect(() => {
      let active = true;
      void window.desktop
         .getAccounts()
         .then((loadedAccounts) => {
            if (active) setAccounts(loadedAccounts);
         })
         .catch((loadError: unknown) => {
            if (active) setError(errorText(loadError));
         })
         .finally(() => {
            if (active) setLoading(false);
         });
      return () => {
         active = false;
      };
   }, []);

   useEffect(() => {
      if (!hash) return;

      document.getElementById(hash.slice(1))?.scrollIntoView({
         behavior: 'smooth',
         block: 'start',
      });
   }, [hash, subcategoryName]);

   const updateField = <K extends keyof AccountForm>(key: K, value: AccountForm[K]) => {
      setForm((current) => ({ ...current, [key]: value }));
   };

   const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSaving(true);
      setError(undefined);
      setNotice(undefined);

      try {
         const accountData = {
            fName: form.fName,
            lName: form.lName,
            displayName: form.displayName || undefined,
            email: form.email,
            imapHost: form.imapHost,
            imapPort: Number(form.imapPort),
            imapSecurity: form.imapSecurity,
            imapUser: form.imapUser,
            smtpHost: form.smtpHost || undefined,
            smtpPort: Number(form.smtpPort),
            smtpSecurity: form.smtpSecurity,
            smtpUser: form.smtpUser || undefined,
            isDefault: form.isDefault,
         };

         const input: AccountInput = { ...accountData, imapPassword: form.imapPassword };
         if (form.smtpPassword) input.smtpPassword = form.smtpPassword;
         await window.desktop.createAccount(input);
         setForm(EMPTY_FORM);
         await refreshAccounts();
         setNotice('Account saved.');
      } catch (saveError) {
         setError(errorText(saveError));
      } finally {
         setSaving(false);
      }
   };

   const removeAccount = async (account: Account) => {
      setRemovingAccountID(account.accountID);
      setError(undefined);
      setNotice(undefined);

      try {
         await window.desktop.deleteAccount(account.accountID);
         await refreshAccounts();
         setNotice('Account removed.');
         setAccountToRemove(undefined);
      } catch (removeError) {
         setError(errorText(removeError));
         setAccountToRemove(undefined);
      } finally {
         setRemovingAccountID(undefined);
      }
   };

   const setDefaultAccount = async (account: Account) => {
      setDefaultingAccountID(account.accountID);
      setError(undefined);
      setNotice(undefined);

      try {
         const input: AccountUpdateInput = {
            accountID: account.accountID,
            fName: account.fName,
            lName: account.lName,
            displayName: account.displayName,
            email: account.email,
            imapHost: account.imapHost,
            imapPort: account.imapPort,
            imapSecurity: account.imapSecurity,
            imapUser: account.imapUser ?? '',
            smtpHost: account.smtpHost,
            smtpPort: account.smtpPort,
            smtpSecurity: account.smtpSecurity,
            smtpUser: account.smtpUser,
            isDefault: true,
         };
         await window.desktop.updateAccount(input);
         await refreshAccounts();
         setNotice(`${account.displayName || account.email} is now the default account.`);
      } catch (updateError) {
         setError(errorText(updateError));
      } finally {
         setDefaultingAccountID(undefined);
      }
   };

   return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
         <AppModal
            open={accountToRemove !== undefined}
            onClose={() => setAccountToRemove(undefined)}
            title="Remove account?"
            actions={
               <>
                  <Button variant="plain" onClick={() => setAccountToRemove(undefined)}>
                     Cancel
                  </Button>
                  <Button
                     color="danger"
                     loading={removingAccountID !== undefined}
                     disabled={!accountToRemove}
                     onClick={() => {
                        if (accountToRemove) void removeAccount(accountToRemove);
                     }}
                  >
                     Remove account
                  </Button>
               </>
            }
         >
            {accountToRemove && (
               <Typography>
                  Remove {accountToRemove.displayName || `${accountToRemove.fName} ${accountToRemove.lName}`} (
                  {accountToRemove.email}) from this device?
               </Typography>
            )}
         </AppModal>
         {error && <Alert color="danger">{error}</Alert>}
         {notice && <Alert color="success">{notice}</Alert>}

         {subcategories.map((subcategory) => (
            <Section
               key={subcategory.name}
               id={subcategory.name}
               sx={{
                  scrollMarginTop: 16,
                  borderColor: hash === `#${subcategory.name}` ? 'primary.500' : undefined,
               }}
            >
               <Box sx={{ pt: 1, pb: 3 }}>
                  <Typography level="h3">{subcategory.displayName}</Typography>
                  <Typography level="body-sm">{subcategory.description}</Typography>
               </Box>

               {subcategory.component === 'manual-account-form' ? (
                  <Box
                     component="form"
                     onSubmit={(event: FormEvent<HTMLFormElement>) => void submit(event)}
                     sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                  >
                     <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        <Field label="First name">
                           <Input
                              required
                              value={form.fName}
                              onChange={(event) => updateField('fName', event.target.value)}
                           />
                        </Field>
                        <Field label="Last name">
                           <Input
                              required
                              value={form.lName}
                              onChange={(event) => updateField('lName', event.target.value)}
                           />
                        </Field>
                        <Field label="Display name (optional)">
                           <Input
                              value={form.displayName}
                              onChange={(event) => updateField('displayName', event.target.value)}
                           />
                        </Field>
                        <Field label="Email address">
                           <Input
                              required
                              type="email"
                              value={form.email}
                              onChange={(event) => updateField('email', event.target.value)}
                           />
                        </Field>
                     </Box>

                     <Divider />
                     <Typography level="title-md" fontWeight={600}>
                        IMAP
                     </Typography>
                     <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr' }, gap: 2 }}>
                        <Field label="IMAP host">
                           <Input
                              required
                              value={form.imapHost}
                              onChange={(event) => updateField('imapHost', event.target.value)}
                           />
                        </Field>
                        <Field label="Port">
                           <Input
                              required
                              type="number"
                              slotProps={{ input: { min: 1, max: 65535 } }}
                              value={form.imapPort}
                              onChange={(event) => updateField('imapPort', event.target.value)}
                           />
                        </Field>
                        <Field label="Security">
                           <Select
                              value={form.imapSecurity}
                              onChange={(_, value) => {
                                 if (value) updateField('imapSecurity', value);
                              }}
                           >
                              <Option value="tls">TLS</Option>
                              <Option value="starttls">STARTTLS</Option>
                              <Option value="none">None</Option>
                           </Select>
                        </Field>
                        <Field label="IMAP username">
                           <Input
                              required
                              value={form.imapUser}
                              onChange={(event) => updateField('imapUser', event.target.value)}
                           />
                        </Field>
                        <Field label="IMAP password">
                           <Input
                              required
                              type="password"
                              value={form.imapPassword}
                              onChange={(event) => updateField('imapPassword', event.target.value)}
                           />
                        </Field>
                     </Box>

                     <Divider />
                     <Typography level="title-md" fontWeight={600}>
                        SMTP (optional)
                     </Typography>
                     <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr' }, gap: 2 }}>
                        <Field label="SMTP host">
                           <Input
                              value={form.smtpHost}
                              onChange={(event) => updateField('smtpHost', event.target.value)}
                           />
                        </Field>
                        <Field label="Port">
                           <Input
                              required={Boolean(form.smtpHost)}
                              type="number"
                              slotProps={{ input: { min: 1, max: 65535 } }}
                              value={form.smtpPort}
                              onChange={(event) => updateField('smtpPort', event.target.value)}
                           />
                        </Field>
                        <Field label="Security">
                           <Select
                              value={form.smtpSecurity}
                              onChange={(_, value) => {
                                 if (value) updateField('smtpSecurity', value);
                              }}
                           >
                              <Option value="tls">TLS</Option>
                              <Option value="starttls">STARTTLS</Option>
                              <Option value="none">None</Option>
                           </Select>
                        </Field>
                        <Field label="SMTP username (optional)">
                           <Input
                              value={form.smtpUser}
                              onChange={(event) => updateField('smtpUser', event.target.value)}
                           />
                        </Field>
                        <Field label="SMTP password">
                           <Input
                              type="password"
                              value={form.smtpPassword}
                              onChange={(event) => updateField('smtpPassword', event.target.value)}
                           />
                        </Field>
                     </Box>

                     <Divider />

                     <Checkbox
                        label="Make this the default account"
                        checked={form.isDefault}
                        onChange={(event) => updateField('isDefault', event.target.checked)}
                     />
                     <Box>
                        <Button type="submit" loading={saving}>
                           Add account
                        </Button>
                     </Box>
                  </Box>
               ) : subcategory.component === 'account-management-list' ? (
                  <>
                     {loading ? (
                        <CircularProgress />
                     ) : accounts.length ? (
                        <OptionGroup sx={{ mt: 2 }}>
                           {accounts.map((account) => (
                              <OptionSelection
                                 key={account.accountID}
                                 showChevron={false}
                                 sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 2,
                                    py: 1.5,
                                 }}
                              >
                                 <Box sx={{ width: '100%', flex: 4 }}>
                                    <Typography level="title-md">
                                       {account.displayName || `${account.fName} ${account.lName}`}
                                       {account.isDefault ? ' (default)' : ''}
                                    </Typography>
                                    <Typography level="body-sm">
                                       {account.email} · {account.imapHost}:{account.imapPort}
                                    </Typography>
                                 </Box>
                                 <Box
                                    sx={{
                                       display: 'flex',
                                       gap: 1,
                                       flex: 2,
                                       justifyContent: 'flex-end',
                                    }}
                                 >
                                    <CookieButton
                                       disabled={
                                          account.isDefault ||
                                          defaultingAccountID !== undefined ||
                                          removingAccountID !== undefined
                                       }
                                       onClick={() => void setDefaultAccount(account)}
                                       icon={account.isDefault ? <Star /> : <StarBorder />}
                                    >
                                       Make Default
                                    </CookieButton>
                                    <CookieButton
                                       color="danger"
                                       onClick={() => setAccountToRemove(account)}
                                       icon={<Delete />}
                                       disabled={removingAccountID !== undefined || defaultingAccountID !== undefined}
                                    >
                                       Delete
                                    </CookieButton>
                                 </Box>
                              </OptionSelection>
                           ))}
                        </OptionGroup>
                     ) : (
                        <Typography level="body-sm">No accounts have been saved.</Typography>
                     )}
                  </>
               ) : null}
            </Section>
         ))}
      </Box>
   );
};

export default AccountSettings;
