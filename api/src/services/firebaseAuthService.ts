import * as admin from 'firebase-admin';
import bcryptjs from 'bcryptjs';
import { UserRepo } from '../typeorm/data-source';
import type { User } from '../typeorm/entities/user.entity';
import CustomError from '../utils/CustomError';


export class FirebaseAuthService {
  
  /**
   * Create a Firebase custom token for a user
   * @param uid - The Firebase UID of the user
   * @returns Custom token string that can be used to sign in to Firebase SDK
   * @throws CustomError if token creation fails
   */
  static async createCustomToken(uid: string): Promise<string> {
    try {
      const customToken = await admin.auth().createCustomToken(uid);
      return customToken;
    } catch (error: any) {
      throw new CustomError(500, `Failed to create Firebase custom token: ${error.message}`);
    }
  }

  static async createFirebaseUser(
    email: string,
    password: string,
    userData: Partial<User>
  ): Promise<{ firebaseUser: admin.auth.UserRecord; dbUser: User }> {
    try {
      // Create user in Firebase
      const firebaseUser = await admin.auth().createUser({
        email,
        password,
        emailVerified: false,
        displayName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
      });

      const hashedPassword = bcryptjs.hashSync(password, 10);
      
      const newUser = UserRepo.create({
        ...userData,
        email,
        firebaseUid: firebaseUser.uid,
        password: hashedPassword,
        role: userData.role || 'USER',
        approved: false,
        emailVerified: false,
        status: 'Active',
      });

      const dbUser = await UserRepo.save(newUser);

      try {
        await admin.firestore().collection('users').doc(firebaseUser.uid).set({
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          middleName: dbUser.middleName || '',
          extName: dbUser.extName || '',
          fullName: dbUser.fullName,
          role: dbUser.role,
          approved: dbUser.approved,
          status: dbUser.status,
          phoneNumber: dbUser.phoneNumber || '',
          location: dbUser.location || '',
          dateOfBirth: dbUser.dateOfBirth || '',
          badgeId: dbUser.badgeId || '',
          emailVerified: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (firestoreError) {
        console.error('Failed to save user to Firestore:', firestoreError);
      }

      return { firebaseUser, dbUser };
    } catch (error: any) {
      // If Firebase user creation fails, don't create in database (for consistency)
      throw new CustomError(500, `Failed to create Firebase user: ${error.message}`);
    }
  }

  static async updateEmailVerificationStatus(firebaseUid: string, verified: boolean): Promise<void> {
    const user = await UserRepo.findOne({ where: { firebaseUid } });
    
    if (user) {
      user.emailVerified = verified;
      await UserRepo.save(user);
    }
  }

  static async disableFirebaseUser(firebaseUid: string): Promise<void> {
    try {
      await admin.auth().updateUser(firebaseUid, { disabled: true });
    } catch (error: any) {
      throw new CustomError(500, `Failed to disable Firebase user: ${error.message}`);
    }
  }

  static async enableFirebaseUser(firebaseUid: string): Promise<void> {
    try {
      await admin.auth().updateUser(firebaseUid, { disabled: false });
    } catch (error: any) {
      throw new CustomError(500, `Failed to enable Firebase user: ${error.message}`);
    }
  }



}