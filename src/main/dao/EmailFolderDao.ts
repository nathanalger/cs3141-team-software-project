import { BaseDao } from './BaseDao';

export type EmailFolderRow = {
   folderID: number;
   accountID: number;
   serverPath: string;
   pathOnDisk: string;
   uidValidity: number | null;
   lastSeenUID: number;
};

const FOLDER_COLUMNS = 'folderID, accountID, serverPath, pathOnDisk, uidValidity, lastSeenUID';

export class EmailFolderDao extends BaseDao {
   constructor() {
      super();
   }
   getOrCreate(accountID: number, serverPath: string, delimiter: string): EmailFolderRow {
      return this.transaction(() => {
         const existing = this.db
            .prepare(`SELECT ${FOLDER_COLUMNS} FROM EmailFolders WHERE accountID = ? AND serverPath = ?`)
            .get(accountID, serverPath) as EmailFolderRow | undefined;
         if (existing) return existing;

         const folderName = serverPath.split(delimiter).pop() || serverPath;
         const result = this.db
            .prepare(`
                 INSERT INTO EmailFolders (accountID, folderName, serverPath, delimiter, pathOnDisk)
                 VALUES (?, ?, ?, ?, ?)
              `)
            .run(accountID, folderName, serverPath, delimiter, `pending:${accountID}:${serverPath}`);

         const folderID = Number(result.lastInsertRowid);
         const pathOnDisk = `${accountID}/${folderID}`;
         this.db.prepare('UPDATE EmailFolders SET pathOnDisk = ? WHERE folderID = ?').run(pathOnDisk, folderID);

         return { folderID, accountID, serverPath, pathOnDisk, uidValidity: null, lastSeenUID: 0 };
      });
   }

   resetForUidValidity(folderID: number, uidValidity: number): void {
      this.transaction(() => {
         this.db.prepare('DELETE FROM Emails WHERE folderID = ?').run(folderID);
         this.db
            .prepare('UPDATE EmailFolders SET uidValidity = ?, lastSeenUID = 0 WHERE folderID = ?')
            .run(uidValidity, folderID);
      });
   }

   markSynced(folderID: number, highestUID: number): void {
      this.db
         .prepare(`UPDATE EmailFolders SET lastSeenUID = MAX(lastSeenUID, ?), lastSyncedAt = datetime('now') WHERE folderID = ?`)
         .run(highestUID, folderID);
   }

}