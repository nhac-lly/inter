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

export async function getAppConfig(): Promise<typeof appConfig> {
  return appConfig || {}
}

// Media Push functions for CDN streaming
export async function createMediaPushConverter(
  channel: string,
  token: string,
  uid: string,
  rtmpUrl: string
): Promise<string> {
  try {
    if (!appConfig.appId || !appConfig.agoraAuth) {
      throw new Error('Server configuration missing: APP_ID or AGORA_AUTH not set');
    }

    console.log('Creating media push converter for:', {
      channel,
      uid,
      rtmpUrl: rtmpUrl.substring(0, 50) + '...', // Log partial URL for security
    });

    const response = await fetch(
      `https://api.agora.io/ap/v1/projects/${appConfig.appId}/rtmp-converters`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${appConfig.agoraAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          converter: {
            name: `stream_${channel}_${uid}_${Date.now()}`,
            transcodeOptions: {
              rtcChannel: channel,
              audioOptions: {
                rtcStreamUids: [Number(uid)],
              },
              videoOptions: {
                frameRate: 30,
                bitrate: 500,
                rtcStreamUids: [Number(uid)],
                canvas: {
                  width: 1280,
                  height: 720,
                },
                layout: [
                  {
                    rtcStreamUid: Number(uid),
                    region: {
                      xPos: 0,
                      yPos: 0,
                      zIndex: 1,
                      width: 1280,
                      height: 720,
                    },
                    fillMode: 'fill',
                  },
                ],
              },
            },
            rtmpUrl: rtmpUrl,
            idleTimeout: 300,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Create converter error response:', errorData);
      throw new Error(
        `Failed to create media push converter: ${
          errorData.reason || response.status
        }`
      );
    }

    const data = await response.json();
    console.log('Create converter response:', data);

    if (!data.converter.id) {
      throw new Error('No converterId returned from create request');
    }

    return data.converter.id;
  } catch (error) {
    console.error('Error creating media push converter:', error);
    throw error;
  }
}

export async function stopMediaPushConverter(converterId: string): Promise<void> {
  try {
    if (!appConfig.appId || !appConfig.agoraAuth) {
      throw new Error('Server configuration missing: APP_ID or AGORA_AUTH not set');
    }

    console.log('Stopping media push converter:', { converterId });

    const response = await fetch(
      `https://api.agora.io/ap/v1/projects/${appConfig.appId}/rtmp-converters/${converterId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Basic ${appConfig.agoraAuth}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Stop converter error response:', errorData);
      throw new Error(
        `Failed to stop media push converter: ${
          errorData.reason || response.status
        }`
      );
    }

    console.log('Media push converter stopped successfully');
  } catch (error) {
    console.error('Error stopping media push converter:', error);
    throw error;
  }
}