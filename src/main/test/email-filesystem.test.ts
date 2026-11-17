import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const electron = vi.hoisted(() => ({ getPath: vi.fn<() => string>() }))
vi.mock('electron', () => ({ app: { getPath: electron.getPath } }))

describe('email filesystem', () => {
   let userDataPath: string
   let filesystem: typeof import('../email-filesystem')

   beforeEach(async () => {
      userDataPath = await mkdtemp(join(tmpdir(), 'mail-filesystem-test-'))
      electron.getPath.mockReturnValue(userDataPath)
      vi.resetModules()
      filesystem = await import('../email-filesystem')
   })

   afterEach(async () => {
      await rm(userDataPath, { recursive: true, force: true })
   })

   it('requires initialization before resolving the mail root', async () => {
      expect(() => filesystem.getMailRoot()).toThrow('Mail store not initialized; call init() first')
   })

   it('initializes the mail root and writes/reads raw email bytes', async () => {
      filesystem.init()

      expect(filesystem.getMailRoot()).toBe(join(userDataPath, 'mail'))

      const source = Buffer.from('From: sender@example.com\r\n\r\nHello')
      const fileName = await filesystem.writeEml('1/2', 17, source)

      expect(fileName).toBe('17.eml')
      expect(await readFile(join(userDataPath, 'mail', '1', '2', fileName))).toEqual(source)
      await expect(filesystem.readEml('1/2', fileName)).resolves.toEqual(source)
   })

   it('replaces an existing UID atomically and removes individual and folder data idempotently', async () => {
      filesystem.init()
      const folder = '1/2'
      const first = Buffer.from('old message')
      const replacement = Buffer.from('updated message')

      await filesystem.writeEml(folder, 8, first)
      await filesystem.writeEml(folder, 8, replacement)
      expect(await filesystem.readEml(folder, '8.eml')).toEqual(replacement)

      await filesystem.removeEml(folder, '8.eml')
      await filesystem.removeEml(folder, '8.eml')
      await expect(filesystem.readEml(folder, '8.eml')).rejects.toMatchObject({ code: 'ENOENT' })

      await filesystem.writeEml(folder, 9, first)
      await filesystem.removeFolderDir(folder)
      await filesystem.removeFolderDir(folder)
      await expect(stat(join(userDataPath, 'mail', '1', '2'))).rejects.toMatchObject({ code: 'ENOENT' })
   })
})
