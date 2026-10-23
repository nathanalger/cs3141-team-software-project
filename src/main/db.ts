import { app } from 'electron'
import { resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const dbFilename = import.meta.env.MAIN_VITE_DB_FILE || 'app.db'

let db: DatabaseSync | undefined

export function getDb() {
   if (!db) throw new Error('DB not initialized; call init() first')
   return db
}

export function init() {

   const dbPath = resolve(app.getPath('userData'), dbFilename)

   try {
      db = new DatabaseSync(dbPath)
      db.exec(`PRAGMA foreign_keys = ON`)
   } catch (error) {
      console.error('[db] Failed to open database:', dbPath, error)
      throw error
   }

   app.on('will-quit', () => getDb().close())
   seedDB()
}

function seedDB() {
   const db = getDb()

   try {
      db.exec(`
         CREATE TABLE IF NOT EXISTS Accounts (
            accountID     INTEGER PRIMARY KEY AUTOINCREMENT,
            fName         TEXT    NOT NULL,
            lName         TEXT    NOT NULL,
            displayName   TEXT,
            email         TEXT    NOT NULL UNIQUE,

            imapHost      TEXT    NOT NULL,
            imapPort      INTEGER NOT NULL DEFAULT 993,
            imapSecurity  TEXT    NOT NULL DEFAULT 'tls'      CHECK (imapSecurity IN ('tls', 'starttls', 'none')),
            imapUser      TEXT,
            imapPassword  BLOB,                            -- encrypted with safeStorage

            smtpHost      TEXT    NOT NULL,
            smtpPort      INTEGER NOT NULL DEFAULT 587,
            smtpSecurity  TEXT    NOT NULL DEFAULT 'starttls' CHECK (smtpSecurity IN ('tls', 'starttls', 'none')),
            smtpUser      TEXT,
            smtpPassword  BLOB,                            -- encrypted with safeStorage

            isDefault     INTEGER NOT NULL DEFAULT 0       CHECK (isDefault IN (0, 1)),
            createdAt     TEXT    NOT NULL DEFAULT (datetime('now'))
         );
      `)

      db.exec(`
         CREATE TABLE IF NOT EXISTS EmailFolders (
            folderID      INTEGER PRIMARY KEY AUTOINCREMENT,
            accountID     INTEGER NOT NULL REFERENCES Accounts(accountID) ON DELETE CASCADE,
            folderName    TEXT    NOT NULL,                -- shown in the UI
            serverPath    TEXT    NOT NULL,                -- IMAP name
            delimiter     TEXT,                            -- "/"
            role          TEXT    CHECK (role IN ('inbox', 'sent', 'drafts', 'trash', 'junk', 'archive', 'outbox')),
            pathOnDisk    TEXT    NOT NULL UNIQUE,
            uidValidity   INTEGER,
            lastSeenUID   INTEGER NOT NULL DEFAULT 0,
            lastSyncedAt  TEXT,

            UNIQUE (accountID, serverPath)
         );

         CREATE INDEX IF NOT EXISTS idx_EmailFolders_accountID ON EmailFolders(accountID);
      `)

      db.exec(`
         CREATE TABLE IF NOT EXISTS Emails (
            emailID       INTEGER PRIMARY KEY AUTOINCREMENT,
            folderID      INTEGER NOT NULL REFERENCES EmailFolders(folderID) ON DELETE CASCADE,
            uid           INTEGER NOT NULL,                -- IMAP UID within the folder
            messageID     TEXT,                            -- Message-ID header
            inReplyTo     TEXT,
            threadID      INTEGER,                         -- use the messageID 

            subject       TEXT,
            fromAddr      TEXT,
            toAddrs       TEXT,                            -- comma-separated
            sentAt        TEXT,                            -- from the Date header of the email
            snippet       TEXT,                            -- first 200ish chars for the list view
            size          INTEGER,
            hasAttach     INTEGER NOT NULL DEFAULT 0       CHECK (hasAttach IN (0, 1)),

            isRead        INTEGER NOT NULL DEFAULT 0       CHECK (isRead IN (0, 1)),
            isFlagged     INTEGER NOT NULL DEFAULT 0       CHECK (isFlagged IN (0, 1)),
            isAnswered    INTEGER NOT NULL DEFAULT 0       CHECK (isAnswered IN (0, 1)),

            fileName      TEXT,                            -- raw .eml path and will be NULL until downloaded

            UNIQUE (folderID, uid)
         );

         CREATE INDEX IF NOT EXISTS idx_Emails_folder_date ON Emails(folderID, sentAt DESC);
         CREATE INDEX IF NOT EXISTS idx_Emails_thread      ON Emails(threadID);
         CREATE INDEX IF NOT EXISTS idx_Emails_messageID   ON Emails(messageID);
      `)

      db.exec(`
         CREATE TABLE IF NOT EXISTS EmailAddresses (
            emailID       INTEGER NOT NULL REFERENCES Emails(emailID) ON DELETE CASCADE,
            kind          TEXT    NOT NULL CHECK (kind IN ('from', 'sender', 'replyTo', 'to', 'cc', 'bcc')),
            position      INTEGER NOT NULL DEFAULT 0,      -- keeps the original order of the email chain
            name          TEXT,                            
            address       TEXT    NOT NULL COLLATE NOCASE, 

            PRIMARY KEY (emailID, kind, position)
         );

         CREATE INDEX IF NOT EXISTS idx_EmailAddresses_address ON EmailAddresses(address, kind);
      `)
   } catch (error) {
      console.error('[db] Failed to seed Database:', error)
      throw error
   }
}
