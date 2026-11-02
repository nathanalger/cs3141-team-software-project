import type { DatabaseSync } from 'node:sqlite';
import { getDb } from '../db';

export abstract class BaseDao {
   protected readonly db: DatabaseSync;

   protected constructor() {
      this.db = getDb();
   }

   protected transaction<T>(operation: () => T): T {
      this.db.exec('BEGIN IMMEDIATE');
      try {
         const result = operation();
         this.db.exec('COMMIT');
         return result;
      } catch (error) {
         this.db.exec('ROLLBACK');
         throw error;
      }
   }
}
