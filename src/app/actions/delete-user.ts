
'use server';
import { getAdminServices } from '@/lib/firebase-admin';

export async function deleteUser(uid: string) {
  if (!uid) {
    throw new Error('User ID is required.');
  }

  try {
    const { auth, db } = await getAdminServices();
    
    // Delete from Firebase Authentication
    await auth.deleteUser(uid);
    
    // Delete from Realtime Database
    const userRef = db.ref(`users/${uid}`);
    await userRef.remove();
    
    return { success: true, message: 'User deleted successfully from all systems.' };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    // Re-throw the error to be caught by the calling client-side function
    throw new Error(error.message || 'An unknown error occurred while deleting the user.');
  }
}
