import { DatabaseSync } from 'node:sqlite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const electron = vi.hoisted(() => ({
   getPath: vi.fn<() => string>(),
   once: vi.fn<(event: string, listener: () => void) => void>(),
}))
vi.mock('electron', () => ({ app: { getPath: electron.getPath, once: electron.once } }))

describe('database initialization', () => {
   let userDataPath: string
   let dbModule: typeof import('../db')
   let quitHandler: (() => void) | undefined

   beforeEach(async () => {
      userDataPath = await mkdtemp(join(tmpdir(), 'mail-db-test-'))
      electron.getPath.mockReturnValue(userDataPath)
      quitHandler = undefined
      electron.once.mockImplementation((_event, listener) => {
         quitHandler = listener
      })
      vi.resetModules()
      dbModule = await import('../db')
   })

   afterEach(async () => {
      quitHandler?.()
      await rm(userDataPath, { recursive: true, force: true })
   })

   it('requires initialization, seeds tables once, enables foreign keys, and closes on quit', () => {
      expect(() => dbModule.getDb()).toThrow('DB not initialized; call init() first')

      const db = dbModule.init()
      expect(dbModule.init()).toBe(db)
      expect(db.prepare('PRAGMA foreign_keys').get()).toMatchObject({ foreign_keys: 1 })

      const tables = db.prepare(
         "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      ).all() as { name: string }[]
      expect(tables.map(({ name }) => name)).toEqual([
         'Accounts',
         'EmailAddresses',
         'EmailFolders',
         'Emails',
         'sqlite_sequence',
      ])
      expect(electron.once).toHaveBeenCalledWith('will-quit', expect.any(Function))

      quitHandler?.()
      expect(() => dbModule.getDb()).toThrow('DB not initialized; call init() first')
      expect(() => db.prepare('SELECT 1').get()).toThrow()
   })

   it('migrates a legacy required SMTP host while retaining account data', () => {
      const legacy = new DatabaseSync(join(userDataPath, 'app.db'))
      legacy.exec(`
         CREATE TABLE Accounts (
            accountID INTEGER PRIMARY KEY AUTOINCREMENT,
            fName TEXT NOT NULL,
            lName TEXT NOT NULL,
            displayName TEXT,
            email TEXT NOT NULL UNIQUE,
            imapHost TEXT NOT NULL,
            imapPort INTEGER NOT NULL DEFAULT 993,
            imapSecurity TEXT NOT NULL DEFAULT 'tls',
            imapUser TEXT,
            imapPassword BLOB,
            smtpHost TEXT NOT NULL,
            smtpPort INTEGER NOT NULL DEFAULT 587,
            smtpSecurity TEXT NOT NULL DEFAULT 'starttls',
            smtpUser TEXT,
            smtpPassword BLOB,
            isDefault INTEGER NOT NULL DEFAULT 0,
            createdAt TEXT NOT NULL DEFAULT (datetime('now'))
         );
         INSERT INTO Accounts (fName, lName, email, imapHost, smtpHost)
         VALUES ('Test', 'User', 'test@example.com', 'imap.example.com', 'smtp.example.com');
      `)
      legacy.close()

      const db = dbModule.init()
      const smtpHost = db.prepare('PRAGMA table_info(Accounts)').all() as {
         name: string
         notnull: number
      }[]
      expect(smtpHost.find(({ name }) => name === 'smtpHost')?.notnull).toBe(0)
      expect(db.prepare('SELECT email, smtpHost FROM Accounts').get()).toEqual({
         email: 'test@example.com',
         smtpHost: 'smtp.example.com',
      })
   })
})
