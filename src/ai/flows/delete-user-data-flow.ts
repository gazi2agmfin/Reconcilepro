'use server';
/**
 * @fileOverview A flow for deleting a user's data from Firestore, including sub-collections.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as admin from 'firebase-admin';
import { initializeAdmin } from '@/ai/admin';

const DeleteUserDataInputSchema = z.object({
  userId: z.string().describe("The UID of the user whose data should be deleted."),
});

const DeleteUserDataOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

async function deleteCollection(collectionPath: string, batchSize: number) {
    initializeAdmin(); 
    const db = admin.firestore();
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(db: admin.firestore.Firestore, query: admin.firestore.Query, resolve: (value?: unknown) => void) {
    const snapshot = await query.get();

    if (snapshot.size === 0) {
        return resolve();
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
    });
}


export async function deleteUserData(
  input: z.infer<typeof DeleteUserDataInputSchema>
): Promise<z.infer<typeof DeleteUserDataOutputSchema>> {
  return deleteUserDataFlow(input);
}

const deleteUserDataFlow = ai.defineFlow(
  {
    name: 'deleteUserDataFlow',
    inputSchema: DeleteUserDataInputSchema,
    outputSchema: DeleteUserDataOutputSchema,
  },
  async ({ userId }) => {
    initializeAdmin();
    const db = admin.firestore();
    const userDocRef = db.collection('users').doc(userId);

    try {
      const reconciliationsPath = `users/${userId}/reconciliations`;
      const reconciliationsCollectionRef = db.collection(reconciliationsPath);
      const reconciliationsSnapshot = await reconciliationsCollectionRef.get();

      for (const reconDoc of reconciliationsSnapshot.docs) {
        await deleteCollection(`${reconciliationsPath}/${reconDoc.id}/fieldNarrations`, 50);
      }
      await deleteCollection(reconciliationsPath, 50);
      
      await userDocRef.delete();
      
      return {
        success: true,
        message: `Successfully deleted all data for user ${userId}.`,
      };
    } catch (error: any) {
      console.error(`Failed to delete data for user ${userId}:`, error);
      return {
        success: false,
        message: error.message || `An unexpected error occurred while deleting data for user ${userId}.`,
      };
    }
  }
);
