
'use server';

import { getAdminServices } from '@/lib/firebase-admin';

export async function verifyAdminEmail(email: string): Promise<{ isAdmin: boolean; error?: string }> {
  if (!email) {
    return { isAdmin: false, error: 'Email address is required.' };
  }

  try {
    const { auth, db } = await getAdminServices();
    
    const userRecord = await auth.getUserByEmail(email);
    const userRef = db.ref(`users/${userRecord.uid}`);
    const snapshot = await userRef.once('value');
    
    if (snapshot.exists() && snapshot.val().role === 'admin') {
      return { isAdmin: true };
    } else {
      return { isAdmin: false };
    }
  } catch (error: any) {
    // If user is not found or any other error, we treat it as "not an admin"
    // to prevent leaking information about which emails are registered.
    console.error('Admin verification error:', error.message);
    return { isAdmin: false };
  }
}
