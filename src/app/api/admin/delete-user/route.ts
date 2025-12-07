import { NextResponse } from 'next/server';
import { deleteUser } from '@/ai/flows/delete-user-flow';
import { deleteUserData } from '@/ai/flows/delete-user-data-flow';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body || {};
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Missing userId in request body' }, { status: 400 });
    }

    // Run both deletion flows in parallel
    const [userDataResult, authUserResult] = await Promise.all([
      deleteUserData({ userId }),
      deleteUser({ userId }),
    ]).catch((err) => {
      // If Promise.all itself rejects (shouldn't, since flows return structured results), return error
      console.error('Error deleting user (parallel):', err);
      return [ { success: false, message: String(err) }, { success: false, message: String(err) } ];
    });

    if (!userDataResult.success || !authUserResult.success) {
      const errors = [];
      if (!userDataResult.success) errors.push(userDataResult.message);
      if (!authUserResult.success) errors.push(authUserResult.message);
      return NextResponse.json({ success: false, message: errors.join('; ') }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'User and associated data deleted.' });
  } catch (error: any) {
    console.error('API /api/admin/delete-user error:', error);
    return NextResponse.json({ success: false, message: error?.message || String(error) }, { status: 500 });
  }
}
