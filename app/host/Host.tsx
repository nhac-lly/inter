"use client";

import { useLocalScreenTrack } from "agora-rtc-react";
import dynamic from "next/dynamic";
import { Suspense, useState, useEffect } from "react";
import {
  generateHostToken,
  getAppConfig,
  getDefaultChannel,
  type AgoraTokenConfig,
} from "@/lib/server-actions";
import { AudioMixer } from "@/app/components/AudioMixer";
import type { ILocalAudioTrack } from "agora-rtc-react";

const ScreenShare = dynamic(() => import("@/app/components/ScreenShare"), {
  ssr: false,
});

interface CloudRecordingConfig {
  resourceId: string;
  sid?: string;
}

interface AppConfig {
  appId: string;
  cert: string;
  channel: string;
  streamUid: string;
  agoraAuth: string;
  secretKey: string;
  accessKey: string;
  bucket: string;
}

export default function Host() {
  const [screenShareOn, setScreenShareOn] = useState(false);
  const [agoraConfig, setAgoraConfig] = useState<AgoraTokenConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mixedAudioTrack, setMixedAudioTrack] =
    useState<ILocalAudioTrack | null>(null);

  // Cloud Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [recordingLoading, setRecordingLoading] = useState(false);
  const [cloudRecording, setCloudRecording] =
    useState<CloudRecordingConfig | null>(null);

  // App config state
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);

  // Fetch app config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await getAppConfig();
        console.log(config, "appConfig");
        setAppConfig(config);
      } catch (error) {
        console.error("Failed to fetch app config:", error);
        setError("Failed to load configuration");
      }
    };

    fetchConfig();
  }, []);

  // Try to get screen sharing with audio first
  const { screenTrack: screenTrackWithAudio, error: screenAudioError } =
    useLocalScreenTrack(
      screenShareOn,
      {
        optimizationMode: "detail",
        encoderConfig: "1080p_1",
      },
      "enable" // Try to enable audio
    );

  // Fallback to video only if audio fails
  const { screenTrack: screenTrackVideoOnly, error: screenVideoError } =
    useLocalScreenTrack(
      screenShareOn && !!screenAudioError,
      {
        optimizationMode: "detail",
        encoderConfig: "1080p_1",
      },
      "disable"
    );

  // Use the track that works
  const screenTrack = screenTrackWithAudio || screenTrackVideoOnly;
  const screenError = screenVideoError; // Only show video errors

  console.log("Host agoraConfig:", agoraConfig);
  console.log("Host screenTrack:", screenTrack);
  console.log("Screen audio error:", screenAudioError);

  // Extract screen audio track if available
  const screenAudioTrack =
    screenTrackWithAudio && Array.isArray(screenTrackWithAudio)
      ? (screenTrackWithAudio.find(
          (track) => track.trackMediaType === "audio"
        ) as ILocalAudioTrack | undefined)
      : null;

  // Generate token when component mounts or when starting screen share
  useEffect(() => {
    const generateToken = async () => {
      if (screenShareOn && !agoraConfig && appConfig) {
        setLoading(true);
        setError(null);
        console.log(appConfig?.streamUid);
        try {
          const channel = await getDefaultChannel();
          const config = await generateHostToken(
            channel,
            Number(appConfig?.streamUid || 20) // hardcoded as env is server
          );
          setAgoraConfig(config);
        } catch (err) {
          console.error("Failed to generate host token:", err);
          setError("Failed to generate authentication token");
          setScreenShareOn(false);
        } finally {
          setLoading(false);
        }
      }
    };

    generateToken();
  }, [screenShareOn, agoraConfig, appConfig]);

  const handleToggleScreenShare = () => {
    if (!screenShareOn) {
      setAgoraConfig(null);
    }
    setScreenShareOn(!screenShareOn);
  };

  const handleMixedAudioChange = (mixedTrack: ILocalAudioTrack | null) => {
    setMixedAudioTrack(mixedTrack);
  };

  // Check if we have video track
  const hasVideoTrack = screenTrack !== null;
  const hasScreenAudio = !!screenAudioTrack;
  const hasMixedAudio = !!mixedAudioTrack;

  // move later to server to hide Basic
  // Client-side Cloud Recording API functions
  const acquireCloudRecording = async (
    channel: string,
    uid: string = "10"
  ): Promise<string> => {
    if (!appConfig) throw new Error("App config not loaded");

    console.log("Acquiring cloud recording for:", { channel, uid });

    const response = await fetch(
      `https://api.agora.io/v1/apps/${appConfig.appId}/cloud_recording/acquire`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${appConfig.agoraAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cname: channel,
          uid: uid,
          clientRequest: {},
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Failed to acquire recording resource: ${
          errorData.reason || response.status
        }`
      );
    }

    const data = await response.json();
    console.log("Acquire recording response:", data);

    if (!data.resourceId) {
      throw new Error("No resourceId returned from acquire request");
    }

    return data.resourceId;
  };

  const startCloudRecording = async (
    channel: string,
    resourceId: string,
    token: string,
    uid: string = "10"
  ): Promise<string> => {
    if (!appConfig) throw new Error("App config not loaded");

    console.log("Starting cloud recording with:", { channel, resourceId, uid });

    const response = await fetch(
      `https://api.agora.io/v1/apps/${appConfig.appId}/cloud_recording/resourceid/${resourceId}/mode/individual/start`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${appConfig.agoraAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cname: channel,
          uid: uid,
          clientRequest: {
            token: token,
            storageConfig: {
              secretKey: appConfig.secretKey,
              vendor: 0,
              region: 0,
              bucket: appConfig.bucket,
              accessKey: appConfig.accessKey,
            },
            recordingConfig: {
              channelType: 0,
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Start recording error response:", errorData);
      throw new Error(
        `Failed to start recording: ${errorData.reason || response.status}`
      );
    }

    const data = await response.json();
    console.log("Start recording response:", data);

    if (!data.sid) {
      throw new Error("No sid returned from start request");
    }

    return data.sid;
  };

  const stopCloudRecording = async (
    channel: string,
    resourceId: string,
    sid: string,
    uid: string = "10"
  ): Promise<void> => {
    if (!appConfig) throw new Error("App config not loaded");

    console.log("Stopping cloud recording with:", {
      channel,
      resourceId,
      sid,
      uid,
    });

    const response = await fetch(
      `https://api.agora.io/v1/apps/${appConfig.appId}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/individual/stop`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${appConfig.agoraAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cname: channel,
          uid: uid,
          clientRequest: {},
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Stop recording error response:", errorData);
      throw new Error(
        `Failed to stop recording: ${errorData.reason || response.status}`
      );
    }

    const data = await response.json();
    console.log("Stop recording response:", data);
  };

  // Recording functions
  const startRecording = async () => {
    if (!agoraConfig) {
      setRecordingError("No streaming session available");
      return;
    }

    try {
      setRecordingError(null);
      setRecordingLoading(true);

      console.log("Starting cloud recording...");

      // Step 1: Acquire recording resource
      const resourceId = await acquireCloudRecording(
        agoraConfig.channel,
        agoraConfig.uid.toString()
      );
      console.log("Acquired resourceId:", resourceId);

      // Step 2: Start recording with the acquired resource
      const sid = await startCloudRecording(
        agoraConfig.channel,
        resourceId,
        agoraConfig.token,
        agoraConfig.uid.toString()
      );
      console.log("Started recording with sid:", sid);

      // Update state
      setCloudRecording({ resourceId, sid });
      setIsRecording(true);
      console.log("Cloud recording started successfully");
    } catch (error) {
      console.error("Failed to start cloud recording:", error);
      setRecordingError(
        "Failed to start recording: " + (error as Error).message
      );
    } finally {
      setRecordingLoading(false);
    }
  };

  const stopRecording = async () => {
    if (!cloudRecording || !agoraConfig) {
      setRecordingError("No active recording session");
      return;
    }

    try {
      setRecordingError(null);
      setRecordingLoading(true);

      console.log("Stopping cloud recording...");

      await stopCloudRecording(
        agoraConfig.channel,
        cloudRecording.resourceId,
        cloudRecording.sid!,
        agoraConfig.uid.toString()
      );

      console.log("Cloud recording stopped successfully");

      // Reset recording state
      setIsRecording(false);
      setCloudRecording(null);
    } catch (error) {
      console.error("Failed to stop cloud recording:", error);
      setRecordingError(
        "Failed to stop recording: " + (error as Error).message
      );
    } finally {
      setRecordingLoading(false);
    }
  };

  // Clean up recording if streaming stops
  useEffect(() => {
    if (!screenShareOn && isRecording && cloudRecording) {
      console.log("Streaming stopped, stopping cloud recording...");
      stopRecording();
    }
  }, [screenShareOn, isRecording, cloudRecording]);

  // Show loading state while config is being fetched
  if (!appConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <div className="mb-4 space-y-4 text-center max-w-md w-full">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">🎥 Host Control Panel</h2>

            {/* Screen Share Button */}
            <button
              className="btn px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-4 w-full"
              onClick={handleToggleScreenShare}
              disabled={loading || (screenShareOn && !agoraConfig)}
            >
              {loading
                ? "Generating Token..."
                : screenShareOn
                ? "Stop Screen Share"
                : "Start Screen Share"}
            </button>

            {/* Cloud Recording Button - Only show when streaming */}
            {screenShareOn && agoraConfig && hasVideoTrack && (
              <button
                className={`btn px-6 py-3 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed mb-4 w-full ${
                  isRecording
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={recordingLoading || !screenShareOn || !hasVideoTrack}
              >
                {recordingLoading ? (
                  <>⏳ Processing...</>
                ) : isRecording ? (
                  <>
                    <span className="animate-pulse mr-2">🔴</span>
                    Stop Cloud Recording
                  </>
                ) : (
                  <>☁️ Start Cloud Recording</>
                )}
              </button>
            )}

            {/* Recording Info */}
            {isRecording && cloudRecording && appConfig && (
              <div className="mt-4 text-xs text-gray-300 bg-green-800 p-3 rounded border border-green-600">
                <div className="font-semibold text-green-200 mb-1">
                  ☁️ Cloud Recording Active
                </div>
                <div>📁 S3 Bucket: {appConfig.bucket}</div>
                <div>🆔 Session: {cloudRecording.sid?.slice(0, 8)}...</div>
                <div className="text-green-300 mt-1">
                  Files will be automatically saved to S3
                </div>
              </div>
            )}

            {agoraConfig && (
              <div className="mt-4 text-sm text-gray-300 bg-gray-700 p-3 rounded">
                <div>
                  Channel:{" "}
                  <span className="text-blue-300">{agoraConfig.channel}</span>
                </div>
                <div>
                  Host UID:{" "}
                  <span className="text-green-300">{agoraConfig.uid}</span>
                </div>
              </div>
            )}

            {/* Broadcasting Status */}
            {screenShareOn && (
              <div className="mt-4 space-y-2">
                <div className="bg-gray-700 p-3 rounded">
                  <div className="text-sm font-semibold mb-2">
                    📡 Broadcasting Status:
                  </div>
                  <div className="text-xs space-y-1">
                    <div
                      className={
                        hasVideoTrack ? "text-green-400" : "text-red-400"
                      }
                    >
                      📹 Video: {hasVideoTrack ? "Active" : "Inactive"}
                    </div>
                    <div
                      className={
                        hasMixedAudio ? "text-green-400" : "text-yellow-400"
                      }
                    >
                      🔊 Audio:{" "}
                      {hasMixedAudio ? "Mixed Audio Active" : "No Audio"}
                    </div>
                    {isRecording && (
                      <div className="text-red-400">
                        <span className="animate-pulse">🔴</span> Cloud
                        Recording Active
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Audio Mixer */}
          {screenShareOn && (
            <AudioMixer
              screenAudio={screenAudioTrack}
              onMixedAudioChange={handleMixedAudioChange}
              enabled={screenShareOn}
            />
          )}

          {/* Show warning if screen audio isn't supported */}
          {screenShareOn && screenAudioError && (
            <div className="bg-yellow-600 p-3 rounded-lg text-sm">
              ⚠️ Screen audio not supported on this browser/platform. You can
              still use the microphone in the audio mixer.
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-600 border border-red-400 text-white rounded max-w-md text-sm">
            {error}
          </div>
        )}

        {screenError && (
          <div className="mb-4 p-3 bg-red-600 border border-red-400 text-white rounded max-w-md text-sm">
            Screen share error: {screenError.message}
          </div>
        )}

        {recordingError && (
          <div className="mb-4 p-3 bg-red-600 border border-red-400 text-white rounded max-w-md text-sm">
            Recording Error: {recordingError}
          </div>
        )}

        {agoraConfig && screenTrack && (
          <ScreenShare
            screenShareOn={screenShareOn}
            screenTrack={screenTrack}
            mixedAudioTrack={mixedAudioTrack}
            agoraConfig={agoraConfig}
            onCloseScreenShare={() => setScreenShareOn(false)}
          />
        )}
      </div>
    </Suspense>
  );
}
