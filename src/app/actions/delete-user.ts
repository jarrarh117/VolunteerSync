
'use server';
import { getAdminServices } from '@/lib/firebase-admin';

export async function deleteUser(uid: string) {
  if (!uid) {
    return { success: false, error: 'User ID is required.' };
  }

  try {
    const { auth, db } = await getAdminServices();
    
    // First, clean up any tasks associated with this user
    const tasksRef = db.ref('tasks');
    const tasksSnapshot = await tasksRef.once('value');
    const tasks = tasksSnapshot.val();
    
    if (tasks) {
      const updates: Record<string, null> = {};
      
      Object.entries(tasks).forEach(([taskId, task]: [string, any]) => {
        // Remove user from signedUpVolunteers
        if (task.signedUpVolunteers && task.signedUpVolunteers[uid]) {
          updates[`tasks/${taskId}/signedUpVolunteers/${uid}`] = null;
        }
        
        // Remove user from completedVolunteers
        if (task.completedVolunteers && task.completedVolunteers[uid]) {
          updates[`tasks/${taskId}/completedVolunteers/${uid}`] = null;
        }
      });
      
      // Apply all updates at once
      if (Object.keys(updates).length > 0) {
        await db.ref().update(updates);
      }
    }
    
    // Delete from Realtime Database
    const userRef = db.ref(`users/${uid}`);
    await userRef.remove();
    
    // Delete from Firebase Authentication (do this last)
    await auth.deleteUser(uid);
    
    return { success: true, message: 'User deleted successfully from all systems.' };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return { 
      success: false, 
      error: error.message || 'An unknown error occurred while deleting the user.' 
    };
  }
}
