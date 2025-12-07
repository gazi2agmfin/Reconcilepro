'use server';
/**
 * @fileOverview A flow for an admin to set a new password for a user.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as admin from 'firebase-admin';
import { initializeAdmin } from '@/ai/admin';

const SetUserPasswordInputSchema = z.object({
  userId: z.string().describe('The UID of the user whose password will be changed.'),
  newPassword: z.string().min(6).describe('The new temporary password for the user.'),
});

const SetUserPasswordOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export async function setUserPassword(
  input: z.infer<typeof SetUserPasswordInputSchema>
): Promise<z.infer<typeof SetUserPasswordOutputSchema>> {
  return setUserPasswordFlow(input);
}

const setUserPasswordFlow = ai.defineFlow(
  {
    name: 'setUserPasswordFlow',
    inputSchema: SetUserPasswordInputSchema,
    outputSchema: SetUserPasswordOutputSchema,
  },
  async ({ userId, newPassword }) => {
    initializeAdmin();
    try {
      await admin.auth().updateUser(userId, {
        password: newPassword,
      });
      return {
        success: true,
        message: `Password for user ${userId} has been updated successfully.`,
      };
    } catch (error: any) {
      console.error(`Failed to update password for user ${userId}:`, error);
      return {
        success: false,
        message: error.message || 'An unexpected error occurred while setting the password.',
      };
    }
  }
);
