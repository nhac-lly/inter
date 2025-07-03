'use server';

import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import { appConfig } from '@/config';

export interface AgoraTokenConfig {
  appId: string;
  channel: string;
  token: string;
  uid: number;
}

export async function generateHostToken(channel: string, uid: number = 10): Promise<AgoraTokenConfig> {
  try {
    // Validate environment variables
    if (!appConfig.appId || !appConfig.cert) {
      throw new Error('Server configuration missing: APP_ID or APP_CERTIFICATE not set');
    }

    // Set token expiration time (24 hours from now)
    const expirationTimeInSeconds = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
    
    // Generate token for host (publisher)
    const token = RtcTokenBuilder.buildTokenWithUid(
      appConfig.appId,
      appConfig.cert,
      channel,
      uid,
      RtcRole.PUBLISHER,
      expirationTimeInSeconds
    );

    const tokenConfig = {
      appId: appConfig.appId,
      channel: channel,
      token: token,
      uid: uid
    };

    console.log(tokenConfig);

    return tokenConfig;
  } catch (error) {
    console.error('Host token generation error:', error);
    throw new Error('Failed to generate host token');
  }
}

export async function generateViewerToken(channel: string, uid: number | null = null): Promise<AgoraTokenConfig> {
  try {
    // Validate environment variables
    if (!appConfig.appId || !appConfig.cert) {
      throw new Error('Server configuration missing: APP_ID or APP_CERTIFICATE not set');
    }

    // Set token expiration time (24 hours from now)
    const expirationTimeInSeconds = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
    
    // Use provided uid or 0 for auto-assignment
    const userUid = uid || 0;
    
    // Generate token for viewer (subscriber)
    const token = RtcTokenBuilder.buildTokenWithUid(
      appConfig.appId,
      appConfig.cert,
      channel,
      userUid,
      RtcRole.SUBSCRIBER,
      expirationTimeInSeconds
    );

    const tokenConfig = {
      appId: appConfig.appId,
      channel: channel,
      token: token,
      uid: userUid
    };

    console.log(tokenConfig);

    return tokenConfig;
  } catch (error) {
    console.error('Viewer token generation error:', error);
    throw new Error('Failed to generate viewer token');
  }
}

export async function getDefaultChannel(): Promise<string> {
  return appConfig.channel || 'default-channel';
} 