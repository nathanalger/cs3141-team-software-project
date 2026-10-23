import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

//Root folder for all emails folders, accounts, and emails
let mailRoot: string | undefined

export function getMailRoot() {
   if (!mailRoot) throw new Error('Mail store not initialized; call init() first')
   return mailRoot
}

export function init() {
   const root = join(app.getPath('userData'), 'mail')

   try {
      mkdirSync(root, { recursive: true })
   } catch (error) {
      console.error('[mail] Failed to create mail root:', root, error)
      throw error
   }

   mailRoot = root
}

