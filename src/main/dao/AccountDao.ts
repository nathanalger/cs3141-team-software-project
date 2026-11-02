import { safeStorage } from 'electron';
import type { Account, AccountCredentials, AccountInput, AccountUpdateInput } from '../../shared/email';
import { BaseDao } from './BaseDao';

type AccountRow = {
   accountID: number;
   fName: string;
   lName: string;
   displayName: string | null;
   email: string;
   imapHost: string;
   imapPort: number;
   imapSecurity: Account['imapSecurity'];
   imapUser: string | null;
   imapPassword?: Uint8Array | null;
   smtpHost: string | null;
   smtpPort: number;
   smtpSecurity: Account['smtpSecurity'];
   smtpUser: string | null;
   smtpPassword?: Uint8Array | null;
   isDefault: number;
   createdAt: string;
};

const ACCOUNT_COLUMNS = `
   accountID, fName, lName, displayName, email,
   imapHost, imapPort, imapSecurity, imapUser,
   smtpHost, smtpPort, smtpSecurity, smtpUser,
   isDefault, createdAt
`;

function mapAccount(row: AccountRow): Account {
   return {
      accountID: row.accountID,
      fName: row.fName,
      lName: row.lName,
      ...(row.displayName ? { displayName: row.displayName } : {}),
      email: row.email,
      imapHost: row.imapHost,
      imapPort: row.imapPort,
      imapSecurity: row.imapSecurity,
      ...(row.imapUser ? { imapUser: row.imapUser } : {}),
      ...(row.smtpHost ? { smtpHost: row.smtpHost } : {}),
      smtpPort: row.smtpPort,
      smtpSecurity: row.smtpSecurity,
      ...(row.smtpUser ? { smtpUser: row.smtpUser } : {}),
      isDefault: row.isDefault === 1,
      createdAt: row.createdAt,
   };
}

function requiredText(value: string, label: string): string {
   const normalized = value.trim();
   if (!normalized) throw new Error(`${label} is required.`);
   return normalized;
}

function validatePort(port: number, label: string): number {
   if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`${label} must be a valid TCP port (1–65535).`);
   }
   return port;
}

function encryptPassword(password: string): Buffer {
   if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Secure credential storage is unavailable on this device.');
   }
   return safeStorage.encryptString(password);
}

function decryptPassword(password: Uint8Array | null | undefined): string {
   if (!password) return '';
   if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Secure credential storage is unavailable on this device.');
   }
   return safeStorage.decryptString(Buffer.from(password));
}

export class AccountDao extends BaseDao {
   constructor() {
      super();
   }

   list(): Account[] {
      const rows = this.db.prepare(`SELECT ${ACCOUNT_COLUMNS} FROM Accounts ORDER BY accountID`).all() as AccountRow[];
      return rows.map(mapAccount);
   }

   getById(accountID: number): Account | undefined {
      const row = this.db
         .prepare(`SELECT ${ACCOUNT_COLUMNS} FROM Accounts WHERE accountID = ?`)
         .get(accountID) as AccountRow | undefined;
      return row ? mapAccount(row) : undefined;
   }

   getForConnectionTests(): AccountCredentials[] {
      const rows = this.db
         .prepare(`SELECT ${ACCOUNT_COLUMNS}, imapPassword, smtpPassword FROM Accounts ORDER BY accountID`)
         .all() as AccountRow[];

      return rows.map((row) => ({
         ...mapAccount(row),
         imapPassword: decryptPassword(row.imapPassword),
         ...(row.smtpPassword ? { smtpPassword: decryptPassword(row.smtpPassword) } : {}),
      }));
   }

   create(input: AccountInput): Account {
      if (!input.imapPassword) throw new Error('An IMAP password is required.');
      const data = this.validate(input);
      const imapPassword = encryptPassword(input.imapPassword);
      if (data.smtpUser && !input.smtpPassword) {
         throw new Error('An SMTP password is required when an SMTP username is provided.');
      }
      if (!data.smtpHost && (data.smtpUser || input.smtpPassword)) {
         throw new Error('An SMTP host is required when SMTP credentials are provided.');
      }
      const smtpPassword = input.smtpPassword ? encryptPassword(input.smtpPassword) : null;

      return this.transaction(() => {
         if (data.isDefault) this.db.prepare('UPDATE Accounts SET isDefault = 0').run();
         const result = this.db
            .prepare(`
               INSERT INTO Accounts (
                  fName, lName, displayName, email,
                  imapHost, imapPort, imapSecurity, imapUser, imapPassword,
                  smtpHost, smtpPort, smtpSecurity, smtpUser, smtpPassword, isDefault
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .run(
               data.fName,
               data.lName,
               data.displayName,
               data.email,
               data.imapHost,
               data.imapPort,
               data.imapSecurity,
               data.imapUser,
               imapPassword,
               data.smtpHost,
               data.smtpPort,
               data.smtpSecurity,
               data.smtpUser,
               smtpPassword,
               data.isDefault ? 1 : 0,
            );
         const account = this.getById(Number(result.lastInsertRowid));
         if (!account) throw new Error('The saved account could not be loaded.');
         return account;
      });
   }

   update(input: AccountUpdateInput): Account {
      if (!Number.isInteger(input.accountID) || input.accountID < 1) {
         throw new Error('A valid account ID is required.');
      }
      const data = this.validate(input);
      const imapPassword = input.imapPassword ? encryptPassword(input.imapPassword) : undefined;
      const smtpPassword = input.smtpPassword ? encryptPassword(input.smtpPassword) : undefined;
      if (!data.smtpHost && data.smtpUser) {
         throw new Error('An SMTP host is required when an SMTP username is provided.');
      }

      return this.transaction(() => {
         if (!this.getById(input.accountID)) throw new Error(`Account ${input.accountID} was not found.`);
         if (data.isDefault) {
            this.db.prepare('UPDATE Accounts SET isDefault = 0 WHERE accountID != ?').run(input.accountID);
         }
         this.db
            .prepare(`
               UPDATE Accounts SET
                  fName = ?, lName = ?, displayName = ?, email = ?,
                  imapHost = ?, imapPort = ?, imapSecurity = ?, imapUser = ?,
                  smtpHost = ?, smtpPort = ?, smtpSecurity = ?, smtpUser = ?,
                  isDefault = ?
               WHERE accountID = ?
            `)
            .run(
               data.fName,
               data.lName,
               data.displayName,
               data.email,
               data.imapHost,
               data.imapPort,
               data.imapSecurity,
               data.imapUser,
               data.smtpHost,
               data.smtpPort,
               data.smtpSecurity,
               data.smtpUser,
               data.isDefault ? 1 : 0,
               input.accountID,
            );

         if (imapPassword) {
            this.db.prepare('UPDATE Accounts SET imapPassword = ? WHERE accountID = ?').run(imapPassword, input.accountID);
         }
         if (smtpPassword) {
            this.db.prepare('UPDATE Accounts SET smtpPassword = ? WHERE accountID = ?').run(smtpPassword, input.accountID);
         } else if (!data.smtpHost) {
            this.db.prepare('UPDATE Accounts SET smtpPassword = NULL WHERE accountID = ?').run(input.accountID);
         }

         const account = this.getById(input.accountID);
         if (!account) throw new Error('The updated account could not be loaded.');
         return account;
      });
   }

   delete(accountID: number): void {
      if (!Number.isInteger(accountID) || accountID < 1) {
         throw new Error('A valid account ID is required.');
      }

      this.transaction(() => {
         if (!this.getById(accountID)) throw new Error(`Account ${accountID} was not found.`);
         this.db.prepare('DELETE FROM Accounts WHERE accountID = ?').run(accountID);
      });
   }

   private validate(input: AccountInput | AccountUpdateInput) {
      const smtpHost = input.smtpHost?.trim() || null;
      const smtpUser = input.smtpUser?.trim() || null;
      if (!smtpHost && (smtpUser || input.smtpPassword)) {
         throw new Error('An SMTP host is required when SMTP credentials are provided.');
      }
      if (smtpHost && !smtpUser && input.smtpPassword) {
         throw new Error('An SMTP username is required when an SMTP password is provided.');
      }

      if (input.imapPassword !== undefined && !input.imapPassword) {
         throw new Error('An IMAP password is required.');
      }

      return {
         fName: requiredText(input.fName, 'First name'),
         lName: requiredText(input.lName, 'Last name'),
         displayName: input.displayName?.trim() || null,
         email: requiredText(input.email, 'Email address'),
         imapHost: requiredText(input.imapHost, 'IMAP host'),
         imapPort: validatePort(input.imapPort, 'IMAP port'),
         imapSecurity: this.validateSecurity(input.imapSecurity, 'IMAP security'),
         imapUser: requiredText(input.imapUser, 'IMAP username'),
         smtpHost,
         smtpPort: validatePort(input.smtpPort ?? 587, 'SMTP port'),
         smtpSecurity: this.validateSecurity(input.smtpSecurity ?? 'starttls', 'SMTP security'),
         smtpUser: smtpHost ? smtpUser : null,
         isDefault: input.isDefault ?? false,
      };
   }

   private validateSecurity(value: string, label: string): Account['imapSecurity'] {
      if (value !== 'tls' && value !== 'starttls' && value !== 'none') {
         throw new Error(`${label} must be TLS, STARTTLS, or none.`);
      }
      return value;
   }
}
