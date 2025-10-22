import * as admin from 'firebase-admin';

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

import { Request, Response, NextFunction } from 'express';
import CustomError from '../../utils/CustomError';

// Test endpoint to verify Firebase Admin is working and show Remote Config values
export const testFirebaseConnection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get Remote Config template
    const template = await admin.remoteConfig().getTemplate();
    
    const parameters = Object.entries(template.parameters || {}).map(([key, param]) => {
      const defaultValue = param.defaultValue;
      let value: string | boolean | number = '';
      let type: 'string' | 'boolean' | 'number' = 'string';
      
      if (defaultValue && 'value' in defaultValue) {
        value = defaultValue.value;
        
        if (value === 'true' || value === 'false') {
          value = value === 'true';
          type = 'boolean';
        } else if (!isNaN(Number(value)) && value !== '') {
          value = Number(value);
          type = 'number';
        }
      }
      
      return {
        key,
        value,
        type,
        description: param.description || `Remote Config parameter: ${key}`,
      };
    });
    
    return res.status(200).json({
      success: true,
      message: 'Firebase Admin connection successful!',
      projectId: admin.app().options.projectId,
      remoteConfigParameters: parameters,
      totalParameters: parameters.length,
    });
  } catch (error: any) {
    console.error('Firebase Admin test error:', error);
    return next(new CustomError(500, `Firebase Admin connection failed: ${error.message}`));
  }
};






//Get Config Values
export const getConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const template = await admin.remoteConfig().getTemplate();
    
    const parameters = Object.entries(template.parameters || {}).map(([key, param]) => {
      const defaultValue = param.defaultValue;
      let value: string | boolean | number = '';
      let type: 'string' | 'boolean' | 'number' = 'string';
      
      if (defaultValue && 'value' in defaultValue) {
        value = defaultValue.value;
        
        if (value === 'true' || value === 'false') {
          value = value === 'true';
          type = 'boolean';
        } else if (!isNaN(Number(value)) && value !== '') {
          value = Number(value);
          type = 'number';
        }
      }
      
      return { key, value, type };
    });
    
    return res.status(200).json({
      success: true,
      parameters,
    });
  } catch (error: any) {
    return next(new CustomError(500, `Failed to get Remote Config: ${error.message}`));
  }
};