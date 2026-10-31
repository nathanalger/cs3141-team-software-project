import { Alert, Box, Button, Checkbox, CircularProgress, Input, Option, Select, Typography } from '@mui/joy';
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Account, AccountInput, AccountUpdateInput, MailSecurity } from '../../../shared/email';
import PageWrapper from '../architecture/PageWrapper';
import Section from '../components/Section';

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

const AccountTestPage = () => {
   const [accounts, setAccounts] = useState<Account[]>([]);
   const [form, setForm] = useState<AccountForm>(EMPTY_FORM);
   const [editingAccountID, setEditingAccountID] = useState<number>();
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState<string>();
   const [notice, setNotice] = useState<string>();

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

   const updateField = <K extends keyof AccountForm>(key: K, value: AccountForm[K]) => {
      setForm((current) => ({ ...current, [key]: value }));
   };

   const resetForm = () => {
      setForm(EMPTY_FORM);
      setEditingAccountID(undefined);
   };

   const editAccount = (account: Account) => {
      setEditingAccountID(account.accountID);
      setForm({
         fName: account.fName,
         lName: account.lName,
         displayName: account.displayName ?? '',
         email: account.email,
         imapHost: account.imapHost,
         imapPort: String(account.imapPort),
         imapSecurity: account.imapSecurity,
         imapUser: account.imapUser ?? '',
         imapPassword: '',
         smtpHost: account.smtpHost ?? '',
         smtpPort: String(account.smtpPort),
         smtpSecurity: account.smtpSecurity,
         smtpUser: account.smtpUser ?? '',
         smtpPassword: '',
         isDefault: account.isDefault,
      });
      setError(undefined);
      setNotice(undefined);
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

         if (editingAccountID === undefined) {
            const input: AccountInput = { ...accountData, imapPassword: form.imapPassword };
            if (form.smtpPassword) input.smtpPassword = form.smtpPassword;
            await window.desktop.createAccount(input);
            setNotice('Account saved.');
         } else {
            const input: AccountUpdateInput = {
               ...accountData,
               accountID: editingAccountID,
               imapPassword: form.imapPassword || undefined,
               smtpPassword: form.smtpPassword || undefined,
            };
            await window.desktop.updateAccount(input);
            setNotice('Account updated.');
         }

         resetForm();
         await refreshAccounts();
      } catch (saveError) {
         setError(errorText(saveError));
      } finally {
         setSaving(false);
      }
   };

   return (
      <PageWrapper>
         <Section sx={{ p: 2 }}>
            <Typography level="h2">Test account setup</Typography>
            <Typography level="body-sm">
               Store an IMAP account for connection testing. Passwords are encrypted on this device and never sent to
               the renderer when accounts are loaded.
            </Typography>
         </Section>

         {error && <Alert color="danger">{error}</Alert>}
         {notice && <Alert color="success">{notice}</Alert>}

         <Section sx={{ p: 2 }}>
            <Typography level="h3" sx={{ mb: 2 }}>
               {editingAccountID === undefined ? 'Add account' : 'Edit account'}
            </Typography>
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

               <Typography level="title-md">IMAP</Typography>
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
                  <Field label={`IMAP password${editingAccountID === undefined ? '' : ' (blank to keep current)'}`}>
                     <Input
                        required={editingAccountID === undefined}
                        type="password"
                        value={form.imapPassword}
                        onChange={(event) => updateField('imapPassword', event.target.value)}
                     />
                  </Field>
               </Box>

               <Typography level="title-md">SMTP (optional)</Typography>
               <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr' }, gap: 2 }}>
                  <Field label="SMTP host">
                     <Input value={form.smtpHost} onChange={(event) => updateField('smtpHost', event.target.value)} />
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
                     <Input value={form.smtpUser} onChange={(event) => updateField('smtpUser', event.target.value)} />
                  </Field>
                  <Field label={`SMTP password${editingAccountID === undefined ? '' : ' (blank to keep current)'}`}>
                     <Input
                        type="password"
                        value={form.smtpPassword}
                        onChange={(event) => updateField('smtpPassword', event.target.value)}
                     />
                  </Field>
               </Box>

               <Checkbox
                  label="Make this the default account"
                  checked={form.isDefault}
                  onChange={(event) => updateField('isDefault', event.target.checked)}
               />
               <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button type="submit" loading={saving}>
                     {editingAccountID === undefined ? 'Save account' : 'Update account'}
                  </Button>
                  {editingAccountID !== undefined && (
                     <Button type="button" variant="plain" onClick={resetForm}>
                        Cancel edit
                     </Button>
                  )}
               </Box>
            </Box>
         </Section>

         <Section sx={{ p: 2 }}>
            <Typography level="h3" sx={{ mb: 2 }}>
               Stored accounts
            </Typography>
            {loading ? (
               <CircularProgress aria-label="Loading accounts" />
            ) : accounts.length ? (
               <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {accounts.map((account) => (
                     <Box
                        key={account.accountID}
                        sx={{
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'space-between',
                           gap: 2,
                           p: 1.5,
                           border: (theme) => `1px solid ${theme.palette.divider}`,
                           borderRadius: 'sm',
                        }}
                     >
                        <Box>
                           <Typography level="title-md">
                              {account.displayName || `${account.fName} ${account.lName}`}
                              {account.isDefault ? ' (default)' : ''}
                           </Typography>
                           <Typography level="body-sm">
                              {account.email} · {account.imapHost}:{account.imapPort}
                           </Typography>
                        </Box>
                        <Button variant="outlined" onClick={() => editAccount(account)}>
                           Edit
                        </Button>
                     </Box>
                  ))}
               </Box>
            ) : (
               <Typography level="body-sm">No accounts have been saved.</Typography>
            )}
         </Section>
      </PageWrapper>
   );
};

export default AccountTestPage;
