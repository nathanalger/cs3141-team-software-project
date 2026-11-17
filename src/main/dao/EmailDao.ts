import type { EmailMessage } from '../../types/email';
import { BaseDao } from './BaseDao';

const ADDRESS_KINDS = ['from', 'to', 'cc', 'bcc', 'replyTo'] as const;

export type NewEmail = {
   folderID: number;
   uid: number;
   fileName: string;
   message: EmailMessage;
   flags: Set<string>;
   size?: number;
   snippet?: string;
   hasAttach: boolean;
};

export type EmailRow = {
   uid: number;
   fileName: string;
   size: number | null;
   isRead: number;
   isFlagged: number;
   isAnswered: number;
};

export class EmailDao extends BaseDao {
   constructor() {
      super();
   }

   storedUids(folderID: number, fromUID: number): Set<number> {
      const rows = this.db
         .prepare('SELECT uid FROM Emails WHERE folderID = ? AND uid >= ? AND fileName IS NOT NULL')
         .all(folderID, fromUID) as { uid: number }[];
      return new Set(rows.map((row) => row.uid));
   }

   insert(email: NewEmail): void {
      const { message } = email;
      this.transaction(() => {
         const result = this.db
            .prepare(`
                 INSERT OR IGNORE INTO Emails (
                    folderID, uid, messageID, inReplyTo, subject, fromAddr, toAddrs, sentAt,
                    snippet, size, hasAttach, isRead, isFlagged, isAnswered, fileName
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `)
            .run(
               email.folderID,
               email.uid,
               message.messageId ?? null,
               message.inReplyTo ?? null,
               message.subject,
               message.from[0]?.address ?? null,
               message.to.map((to) => to.address).join(', '),
               message.date?.toISOString() ?? null,
               email.snippet ?? null,
               email.size ?? null,
               email.hasAttach ? 1 : 0,
               email.flags.has('\\Seen') ? 1 : 0,
               email.flags.has('\\Flagged') ? 1 : 0,
               email.flags.has('\\Answered') ? 1 : 0,
               email.fileName,
            );
         if (result.changes === 0) return; // another sync already stored this message

         const emailID = Number(result.lastInsertRowid);
         const insertAddress = this.db.prepare(
            'INSERT INTO EmailAddresses (emailID, kind, position, name, address) VALUES (?, ?, ?, ?, ?)',
         );
         for (const kind of ADDRESS_KINDS) {
            message[kind].forEach((address, position) => {
               insertAddress.run(emailID, kind, position, address.name ?? null, address.address);
            });
         }
      });
   }

   // Reconciles local rows against the server's full UID -> flags map.
   // Returns the fileNames of deleted rows so the caller can remove them from disk.
   syncFolderState(folderID: number, serverFlags: Map<number, Set<string>>): string[] {
      return this.transaction(() => {
         const local = this.db
            .prepare('SELECT uid, fileName, isRead, isFlagged, isAnswered FROM Emails WHERE folderID = ?')
            .all(folderID) as Omit<EmailRow, 'size'>[];
         const remove = this.db.prepare('DELETE FROM Emails WHERE folderID = ? AND uid = ?');
         const update = this.db.prepare(
            'UPDATE Emails SET isRead = ?, isFlagged = ?, isAnswered = ? WHERE folderID = ? AND uid = ?',
         );

         const removedFiles: string[] = [];
         for (const row of local) {
            const flags = serverFlags.get(row.uid);
            if (!flags) {
               remove.run(folderID, row.uid);
               if (row.fileName) removedFiles.push(row.fileName);
               continue;
            }
            const isRead = flags.has('\\Seen') ? 1 : 0;
            const isFlagged = flags.has('\\Flagged') ? 1 : 0;
            const isAnswered = flags.has('\\Answered') ? 1 : 0;
            if (isRead !== row.isRead || isFlagged !== row.isFlagged || isAnswered !== row.isAnswered) {
               update.run(isRead, isFlagged, isAnswered, folderID, row.uid);
            }
         }
         return removedFiles;
      });
   }

   listByFolder(folderID: number, limit: number, beforeUID?: number): EmailRow[] {
      return this.db
         .prepare(`
              SELECT uid, fileName, size, isRead, isFlagged, isAnswered
              FROM Emails
              WHERE folderID = ? AND fileName IS NOT NULL AND uid < ?
              ORDER BY uid DESC
              LIMIT ?
           `)
         .all(folderID, beforeUID ?? Number.MAX_SAFE_INTEGER, limit) as EmailRow[];
   }
}

