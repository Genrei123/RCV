import { db } from '../utils/firebase';
import { collection, getDocs } from 'firebase/firestore';

export class FirestoreService {
  static async testConnection(): Promise<boolean> {
    try {
      const usersCollection = collection(db, 'users');
      await getDocs(usersCollection);
      return true;
    } catch (error) {
      console.error('Firebase connection failed:', error);
      return false;
    }
  }

  static async getAllUsers(): Promise<any[]> {
    try {
      const usersCollection = collection(db, 'users');
      const snapshot = await getDocs(usersCollection);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }
}