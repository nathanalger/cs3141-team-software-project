import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'


//Root folder for all emails folders, accounts, and emails
let mailRoot: string | undefined

export function getMailRoot() {
   if (!mailRoot) throw new Error('Mail store not initialized; call init() first')
   return mailRoot
}

function resolveInMailRoot(relativePath: string) {
   return join(getMailRoot(), relativePath)
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

export async function writeEml(folderPath: string, uid: number, source: Buffer){
   const dir = resolveInMailRoot(folderPath)
   await mkdir(dir, { recursive: true })
   const fileName = `${uid}.eml`
   const tempPath = join(dir, `${fileName}.${randomUUID()}.tmp`)
   await writeFile(tempPath, source)
   await rename(tempPath, join(dir, fileName))
   return fileName
}

export function readEml(folderPath: string, fileName: string) {
   return readFile(join(resolveInMailRoot(folderPath), fileName))
}

export async function removeEml(folderPath: string, fileName: string) {
   await rm(join(resolveInMailRoot(folderPath), fileName), { force: true })
}

export async function removeFolderDir(folderPath: string) {
   await rm(resolveInMailRoot(folderPath), { recursive: true, force: true })
}
