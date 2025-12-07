'use server';

import { deleteUser } from '@/ai/flows/delete-user-flow';
import { deleteUserData } from '@/ai/flows/delete-user-data-flow';
import { setUserPassword } from '@/ai/flows/set-user-password-flow';

export async function handleDeleteUserAction(userId: string) {
  try {
    // Both operations can run in parallel
    const [userDataResult, authUserResult] = await Promise.all([
        deleteUserData({ userId }),
        deleteUser({ userId })
    ]);

    if (!userDataResult.success || !authUserResult.success) {
        // Combine error messages if any
        const errors = [];
        if (!userDataResult.success) errors.push(userDataResult.message);
        if (!authUserResult.success) errors.push(authUserResult.message);
        throw new Error(errors.join('; '));
    }

    return { success: true, message: 'User and all associated data deleted successfully.' };
  } catch (error: any) {
    console.error(`Failed to completely delete user ${userId}:`, error);
    return { success: false, message: error.message || 'An unknown error occurred during user deletion.' };
  }
}

export async function handleDeleteAllUsersAction(userIds: string[]) {
    if (!userIds || userIds.length === 0) {
        return { success: false, message: 'No user IDs provided.' };
    }

    const results = await Promise.all(userIds.map(userId => handleDeleteUserAction(userId)));

    const failedDeletions = results.filter(r => !r.success);

    if (failedDeletions.length > 0) {
        return { 
            success: false, 
            message: `Failed to delete ${failedDeletions.length} user(s). Check server logs for details.`
        };
    }

    return { success: true, message: 'All selected users and their data have been deleted successfully.' };
}


export async function handleSetUserPasswordAction(userId: string) {
    const newPassword = Math.random().toString(36).slice(-8);
    try {
        const result = await setUserPassword({ userId, newPassword });
        if (result.success) {
            return { success: true, newPassword: newPassword, message: 'Password set successfully.' };
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        console.error(`Failed to set password for user ${userId}:`, error);
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
}
