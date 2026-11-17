import { beforeEach, describe, expect, it, vi } from 'vitest'

const electron = vi.hoisted(() => ({
   exposeInMainWorld: vi.fn(),
   invoke: vi.fn(),
   on: vi.fn(),
   removeListener: vi.fn(),
}))
vi.mock('electron', () => ({
   contextBridge: { exposeInMainWorld: electron.exposeInMainWorld },
   ipcRenderer: {
      invoke: electron.invoke,
      on: electron.on,
      removeListener: electron.removeListener,
   },
}))

describe('preload desktop bridge', () => {
   let desktop: Record<string, (...args: unknown[]) => unknown> & { platform: string }

   beforeEach(async () => {
      electron.exposeInMainWorld.mockReset()
      electron.invoke.mockReset()
      electron.on.mockReset()
      electron.removeListener.mockReset()
      vi.resetModules()
      await import('../index')
      desktop = electron.exposeInMainWorld.mock.calls[0][1] as typeof desktop
   })

   it('exposes desktop APIs that invoke their corresponding IPC channels', async () => {
      expect(electron.exposeInMainWorld).toHaveBeenCalledWith('desktop', expect.any(Object))
      expect(desktop.platform).toBe(process.platform)

      await desktop.minimize()
      await desktop.toggleMaximize()
      await desktop.close()
      await desktop.isMaximized()
      await desktop.testMailConnections()
      await desktop.listMailboxes(3)
      await desktop.fetchEmails()
      await desktop.sendEmail({} as never)
      await desktop.getAccounts()
      await desktop.createAccount({} as never)
      await desktop.updateAccount({} as never)
      await desktop.deleteAccount(3)
      await desktop.getSettings()
      await desktop.setSetting('theme', 'dark' as never)

      expect(electron.invoke.mock.calls).toEqual([
         ['window:minimize'],
         ['window:toggle-maximize'],
         ['window:close'],
         ['window:is-maximized'],
         ['mail:test-connections'],
         ['mail:list-mailboxes', 3],
         ['mail:fetch-emails', {}],
         ['mail:send-email', {}],
         ['accounts:list'],
         ['accounts:create', {}],
         ['accounts:update', {}],
         ['accounts:delete', 3],
         ['settings:get-all'],
         ['settings:set', 'theme', 'dark'],
      ])
   })

   it('forwards maximize changes and returns an unsubscribe function for its exact listener', () => {
      const callback = vi.fn()

      const unsubscribe = desktop.onMaximizeChange(callback as never) as () => void
      const [channel, listener] = electron.on.mock.calls[0]
      expect(channel).toBe('window:maximize-change')

      listener({}, true)
      expect(callback).toHaveBeenCalledWith(true)

      unsubscribe()
      expect(electron.removeListener).toHaveBeenCalledWith(channel, listener)
   })
})
