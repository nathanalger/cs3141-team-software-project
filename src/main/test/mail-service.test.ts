import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AccountCredentials } from '../../shared/email'

const mocks = vi.hoisted(() => ({
   accountDao: {
      getForMailOperations: vi.fn(),
      getForConnectionTests: vi.fn(),
   },
   emailDao: {
      syncFolderState: vi.fn(),
      storedUids: vi.fn(),
      insert: vi.fn(),
      listByFolder: vi.fn(),
   },
   folderDao: {
      getOrCreate: vi.fn(),
      resetForUidValidity: vi.fn(),
      markSynced: vi.fn(),
   },
   imap: {
      on: vi.fn(),
      connect: vi.fn(),
      list: vi.fn(),
      logout: vi.fn(),
      close: vi.fn(),
      getMailboxLock: vi.fn(),
      mailbox: undefined as unknown,
      fetchAll: vi.fn(),
   },
   lock: { release: vi.fn() },
   transporter: {
      sendMail: vi.fn(),
      verify: vi.fn(),
      close: vi.fn(),
   },
   createTransport: vi.fn(),
   writeEml: vi.fn(),
   readEml: vi.fn(),
   removeEml: vi.fn(),
   removeFolderDir: vi.fn(),
   simpleParser: vi.fn(),
}))

vi.mock('nodemailer', () => ({ default: { createTransport: mocks.createTransport } }))
vi.mock('imapflow', () => ({
   ImapFlow: vi.fn(function ImapFlowMock() { return mocks.imap }),
}))
vi.mock('mailparser', () => ({ simpleParser: mocks.simpleParser }))
vi.mock('../dao/AccountDao', () => ({
   AccountDao: vi.fn(function AccountDaoMock() { return mocks.accountDao }),
}))
vi.mock('../dao/EmailDao', () => ({
   EmailDao: vi.fn(function EmailDaoMock() { return mocks.emailDao }),
}))
vi.mock('../dao/EmailFolderDao', () => ({
   EmailFolderDao: vi.fn(function EmailFolderDaoMock() { return mocks.folderDao }),
}))
vi.mock('../email-filesystem', () => ({
   readEml: mocks.readEml,
   removeEml: mocks.removeEml,
   removeFolderDir: mocks.removeFolderDir,
   writeEml: mocks.writeEml,
}))

import {
   fetchEmails,
   listMailboxes,
   sendEmail,
   testMailConnections,
} from '../mail-service'

const account: AccountCredentials = {
   accountID: 1,
   fName: 'Alex',
   lName: 'Example',
   displayName: 'Alex E.',
   email: 'alex@example.com',
   imapHost: 'imap.example.com',
   imapPort: 993,
   imapSecurity: 'tls',
   imapPassword: 'imap-secret',
   smtpHost: 'smtp.example.com',
   smtpPort: 587,
   smtpSecurity: 'starttls',
   smtpUser: 'alex@example.com',
   smtpPassword: 'smtp-secret',
   isDefault: true,
}

const parsedMail = {
   messageId: '<message@example.com>',
   from: { value: [{ name: 'Sender', address: 'sender@example.com' }] },
   to: { value: [{ address: 'alex@example.com' }] },
   cc: undefined,
   bcc: undefined,
   replyTo: undefined,
   subject: 'Test message',
   text: 'Message body',
   html: '<p>Message body</p>',
   date: new Date('2025-01-02T03:04:05.000Z'),
   inReplyTo: undefined,
   references: '<previous@example.com>',
   attachments: [],
}

describe('mail service', () => {
   beforeEach(() => {
      vi.clearAllMocks()
      mocks.accountDao.getForMailOperations.mockReturnValue(account)
      mocks.accountDao.getForConnectionTests.mockReturnValue([])
      mocks.imap.connect.mockResolvedValue(undefined)
      mocks.imap.list.mockResolvedValue([])
      mocks.imap.logout.mockResolvedValue(undefined)
      mocks.imap.getMailboxLock.mockResolvedValue(mocks.lock)
      mocks.imap.mailbox = undefined
      mocks.imap.fetchAll.mockResolvedValue([])
      mocks.lock.release.mockReset()
      mocks.transporter.sendMail.mockResolvedValue({ messageId: '<sent@example.com>' })
      mocks.transporter.verify.mockResolvedValue(undefined)
      mocks.createTransport.mockReturnValue(mocks.transporter)
      mocks.writeEml.mockResolvedValue('1.eml')
      mocks.readEml.mockResolvedValue(Buffer.from('From: sender@example.com\r\n\r\nMessage body'))
      mocks.removeEml.mockResolvedValue(undefined)
      mocks.removeFolderDir.mockResolvedValue(undefined)
      mocks.simpleParser.mockResolvedValue(parsedMail)
      mocks.emailDao.syncFolderState.mockReturnValue([])
      mocks.emailDao.storedUids.mockReturnValue(new Set<number>())
      mocks.emailDao.listByFolder.mockReturnValue([])
   })

   it('rejects invalid outgoing message fields before opening an SMTP transport', async () => {
      await expect(sendEmail({
         to: [],
         subject: 'Hello',
         text: 'Body',
      })).rejects.toThrow('At least one valid recipient is required.')
      await expect(sendEmail({
         to: [{ address: 'not-an-address' }],
         subject: 'Hello',
         text: 'Body',
      })).rejects.toThrow('A valid email address is required.')
      await expect(sendEmail({
         to: [{ address: 'valid@example.com' }],
         subject: 'Hello',
         text: '   ',
      })).rejects.toThrow('The email message cannot be empty.')

      expect(mocks.createTransport).not.toHaveBeenCalled()
   })

   it('sends validated recipients with account identity and always closes the SMTP transport', async () => {
      const request = {
         to: [{ name: 'Recipient', address: 'to@example.com' }],
         cc: [{ address: 'cc@example.com' }],
         bcc: [{ address: 'bcc@example.com' }],
         subject: 'Subject',
         text: 'Plain text',
         html: '<p>HTML</p>',
      }

      await expect(sendEmail(request)).resolves.toEqual({ messageId: '<sent@example.com>' })
      expect(mocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({
         host: account.smtpHost,
         port: account.smtpPort,
         secure: false,
         requireTLS: true,
         auth: { user: account.email, pass: account.smtpPassword },
      }))
      expect(mocks.transporter.sendMail).toHaveBeenCalledWith({
         from: { name: account.displayName, address: account.email },
         ...request,
      })
      expect(mocks.transporter.close).toHaveBeenCalledOnce()
   })

   it('closes the SMTP transport when sending fails and rejects incomplete SMTP configuration', async () => {
      mocks.transporter.sendMail.mockRejectedValueOnce(new Error('SMTP unavailable'))
      await expect(sendEmail({
         to: [{ address: 'to@example.com' }],
         subject: 'Subject',
         text: 'Body',
      })).rejects.toThrow('SMTP unavailable')
      expect(mocks.transporter.close).toHaveBeenCalledOnce()

      mocks.accountDao.getForMailOperations.mockReturnValueOnce({ ...account, smtpHost: undefined })
      await expect(sendEmail({
         to: [{ address: 'to@example.com' }],
         subject: 'Subject',
         text: 'Body',
      })).rejects.toThrow('No SMTP server is configured')

      mocks.accountDao.getForMailOperations.mockReturnValueOnce({
         ...account,
         smtpUser: 'alex',
         smtpPassword: undefined,
      })
      await expect(sendEmail({
         to: [{ address: 'to@example.com' }],
         subject: 'Subject',
         text: 'Body',
      })).rejects.toThrow('No SMTP password is stored')
      expect(mocks.createTransport).toHaveBeenCalledOnce()
   })

   it('maps mailbox metadata and releases the IMAP connection', async () => {
      mocks.imap.list.mockResolvedValue([{
         path: 'Projects',
         name: 'Projects',
         delimiter: null,
         specialUse: '\\Archive',
         flags: new Set(['\\HasNoChildren']),
      }])

      await expect(listMailboxes()).resolves.toEqual([{
         path: 'Projects',
         name: 'Projects',
         delimiter: '/',
         specialUse: '\\Archive',
         flags: ['\\HasNoChildren'],
      }])
      expect(mocks.imap.logout).toHaveBeenCalledOnce()
      expect(mocks.imap.close).toHaveBeenCalledOnce()
   })

   it('rejects invalid fetch pagination before connecting to IMAP', async () => {
      await expect(fetchEmails({ limit: 0 })).rejects.toThrow('between 1 and 200')
      await expect(fetchEmails({ limit: 201 })).rejects.toThrow('between 1 and 200')
      await expect(fetchEmails({ limit: 1.5 })).rejects.toThrow('between 1 and 200')
      await expect(fetchEmails({ beforeUID: 0 })).rejects.toThrow('beforeUID must be a positive whole number')
      expect(mocks.imap.connect).not.toHaveBeenCalled()
   })

   it('downloads and persists the newest UID page, then returns parsed stored mail', async () => {
      const source = Buffer.from('From: sender@example.com\r\n\r\nMessage body')
      mocks.imap.mailbox = { delimiter: '/', uidValidity: 9, exists: 1 }
      mocks.imap.fetchAll
         .mockResolvedValueOnce([{ uid: 1, flags: new Set(['\\Seen']) }])
         .mockResolvedValueOnce([{
            uid: 1,
            flags: new Set(['\\Seen']),
            size: 42,
            source,
         }])
      mocks.folderDao.getOrCreate.mockReturnValue({
         folderID: 2,
         accountID: 1,
         serverPath: 'INBOX',
         pathOnDisk: '1/2',
         uidValidity: 9,
         lastSeenUID: 0,
      })
      mocks.emailDao.listByFolder.mockReturnValue([{
         uid: 1,
         fileName: '1.eml',
         size: 42,
         isRead: 1,
         isFlagged: 0,
         isAnswered: 0,
      }])

      await expect(fetchEmails()).resolves.toEqual([{
         message: {
            id: '<message@example.com>',
            messageId: '<message@example.com>',
            from: [{ address: 'sender@example.com', name: 'Sender' }],
            to: [{ address: 'alex@example.com' }],
            cc: [],
            bcc: [],
            replyTo: [],
            subject: 'Test message',
            text: 'Message body',
            html: '<p>Message body</p>',
            date: parsedMail.date,
            references: ['<previous@example.com>'],
         },
         mailbox: 'INBOX',
         uid: 1,
         uidValidity: 9,
         flags: new Set(['\\Seen']),
         size: 42,
      }])
      expect(mocks.emailDao.insert).toHaveBeenCalledWith(expect.objectContaining({
         folderID: 2,
         uid: 1,
         fileName: '1.eml',
         flags: new Set(['\\Seen']),
         size: 42,
         snippet: 'Message body',
         hasAttach: false,
      }))
      expect(mocks.folderDao.markSynced).toHaveBeenCalledWith(2, 1)
      expect(mocks.lock.release).toHaveBeenCalledOnce()
      expect(mocks.imap.logout).toHaveBeenCalledOnce()
      expect(mocks.imap.close).toHaveBeenCalledOnce()
   })

   it('reports absent accounts and failed SMTP verification as unsuccessful connection results', async () => {
      await expect(testMailConnections()).resolves.toEqual({
         success: false,
         results: [{ service: 'IMAP', success: false, message: 'No accounts are stored yet.' }],
      })

      mocks.accountDao.getForConnectionTests.mockReturnValue([account])
      mocks.imap.list.mockRejectedValueOnce(new Error('IMAP unavailable'))
      mocks.transporter.verify.mockRejectedValueOnce(new Error('SMTP unavailable'))

      await expect(testMailConnections()).resolves.toEqual({
         success: false,
         results: [
            { service: 'IMAP', accountEmail: account.email, success: false, message: 'IMAP unavailable' },
            { service: 'SMTP', accountEmail: account.email, success: false, message: 'SMTP unavailable' },
         ],
      })
      expect(mocks.transporter.close).toHaveBeenCalledOnce()
      expect(mocks.imap.close).toHaveBeenCalledOnce()
   })
})
