
'use server';
/**
 * @fileOverview A flow for deleting a user from Firebase Authentication.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as admin from 'firebase-admin';
import { initializeAdmin } from '@/ai/admin';

const DeleteUserInputSchema = z.object({
  userId: z.string().describe('The UID of the user to delete.'),
});

const DeleteUserOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export async function deleteUser(
  input: z.infer<typeof DeleteUserInputSchema>
): Promise<z.infer<typeof DeleteUserOutputSchema>> {
  return deleteUserFlow(input);
}

const deleteUserFlow = ai.defineFlow(
  {
    name: 'deleteUserFlow',
    inputSchema: DeleteUserInputSchema,
    outputSchema: DeleteUserOutputSchema,
  },
  async ({ userId }) => {
    initializeAdmin();
    try {
      await admin.auth().deleteUser(userId);
      return {
        success: true,
        message: `Successfully deleted user ${userId} from Authentication.`,
      };
    } catch (error: any) {
      console.error(`Failed to delete user ${userId} from Authentication:`, error);
      // Don't re-throw, instead return a structured error response
      // to be handled by the calling Server Action.
      return {
        success: false,
        message: error.message || 'An unexpected error occurred while deleting the user.',
      };
    }
  }
);
