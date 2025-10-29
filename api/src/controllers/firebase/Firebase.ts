import * as admin from 'firebase-admin';

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "rcv-flutterfire",
      privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCSaMu3QS17HVXi\n11h9CzBT55ALLXjrHWiyJ4gZkuVDSKzAcTGC8Ee3u5g3IJqAT08aNYo7aH3IAV9U\nGFoe8Pg/lPQnHTQotQ7NRNnCsjtDEBbyAp/iegsW89ztvuClTtmEUD4CyzB10ZeF\nSq+IVEv8xqSWTalCaVlOuufwJInm80RrZlCOZ87zHUqFJUTkV0ZltnPitWU52hQq\n3fCzJ4BEEcNorO7/0y/nv4aCDboJm2gWVLDGEGPyRrLI7PUebF6Ba3fzY5+UGXSh\nQg03LG1klA17j6tX3Vy45pVpR04jbUodQ1vhoCraBPr6LSkS+Tzrtc9smrt35gU3\nqiK+gu+PAgMBAAECggEAC0Csr5f90+GMUVP1xB6RB1Hb21ASZBetjUvGhRiqMEKs\nrFnG0WaATJnJeCs0VLpDvSLyTeCZEj8wwXjhrFEe81wSa9MtyBcqXRJ2niUustfQ\nu6cB/NkecxQpHci24V2vECFOss5FGjkSqTb1SMgZ0wK9caPkZ2tLZuasnuNgCfT4\nusYtIhLBnfGmwdeVRwalmMQ4WB6ajUgO0rV+jBLRG9uLVwujj4M+XP5m9ynZu4Eq\ndJW8SADy9oNLLhHd6QVUldCsCzEp92b5PBlalQUMt8PUNTu+gVJFtuVKjVJNyC1y\nFMP0rbEHNIzdhJCrdhlmKRu3K6vhdXNLgpI8mtqesQKBgQDKFqrP63ypEjZolovK\n07Ve5/DlUxuxrcDPkORrdla14Q4T2oxVyRWjFUDxDU5thXEu7zKikyoZBQnkL+hC\nvTpdJnHKFqIoEePsqNfGPxYbWsG06dqEeY1PmyJsr+Q81w/QHgR1VTaInJ+fW/pY\nEYI2NyIWls57TqC+o+3QT98sdwKBgQC5d5o3sQCchEl/AO39qv0M+nO5imtD15eP\nYBH0KEOksSX7Wr7VVK+HbD+qd+hesXRGlUI72hk4TTsYORx7v+s6RU+uLJbrTrpA\nNA1wKxUQLhUHP20YyW91ZfyaB8PHu01aK6n2x3wjjqjmPmLK+CvYLPwzqCfHIfbo\nQTXiQlxTqQKBgDHZYY0kQ33ZFj66VAVWL7kXcZ6/32b2u0b4MMApUr5Oo5BWKqPG\nlGXECl7rr1rovcCcFFtx/cJqMcRt5NcBonHz18HHz3we3aA1DfTC/wsEWh/sR5DC\nAw+N7vHseVpgmm/115exy1/rcpx2rcwnlX0WIHx9+rUD8jbUbQcjjKOFAoGBAJhj\n/rJN3Lu+MomJYQNycJQuYdINOw+2YJDtFjNwtgvnhtbd/DlbaRKzzigqeCL+WhT4\n5UA6d0h8pNbFbnL8AbKSauMpPiRAPucsHfKRY7A0vRCEfAbG1K84ynJheOtvKiKy\nB+h+hrDMsljk39X4TkZEyEFFpNGJRdAWbMjpT+VpAoGBALEVIsjud1cjDXk50fcr\nfdXC0A/PE5dGVxUPCcXsaMiU177hNHV+AoJpxJ1Q1EODBU97yprx8J69kYAki6mD\nLMqxSSr0MpilbCvv16Y4weqpHrZ7WjMSp9UjHUqbva6a+fp7w77SOBFHdK9h6VSB\nCXrgz/YaKRAD0IARU6M7nDd6\n-----END PRIVATE KEY-----\n",
      clientEmail: "firebase-adminsdk-fbsvc@rcv-flutterfire.iam.gserviceaccount.com",
    }),
    projectId: "rcv-flutterfire",
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

// Publish Config Changes
export const publishConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { parameters } = req.body;
    
    if (!parameters || !Array.isArray(parameters)) {
      return next(new CustomError(400, 'Parameters array is required'));
    }
    
    const template = await admin.remoteConfig().getTemplate();
    
    parameters.forEach(({ key, value, type }) => {
      if (!key) return;
      
      template.parameters[key] = {
        defaultValue: { value: String(value) }
      };
    });
    
    const publishedTemplate = await admin.remoteConfig().publishTemplate(template);
    
    return res.status(200).json({
      success: true,
      message: 'Remote Config published successfully',
      version: publishedTemplate.version?.versionNumber,
    });
  } catch (error: any) {
    return next(new CustomError(500, `Failed to publish Remote Config: ${error.message}`));
  }
};