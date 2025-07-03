"use client";

import { useLocalScreenTrack } from "agora-rtc-react";
import dynamic from "next/dynamic";
import { Suspense, useState, useEffect } from "react";
import {
  generateHostToken,
  getDefaultChannel,
  type AgoraTokenConfig,
} from "@/lib/server-actions";
import { AudioMixer } from "@/app/components/AudioMixer";
import type { ILocalAudioTrack } from "agora-rtc-react";

const ScreenShare = dynamic(() => import("@/app/components/ScreenShare"), {
  ssr: false,
});

export default function Host() {
  const [screenShareOn, setScreenShareOn] = useState(false);
  const [agoraConfig, setAgoraConfig] = useState<AgoraTokenConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mixedAudioTrack, setMixedAudioTrack] =
    useState<ILocalAudioTrack | null>(null);

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
      if (screenShareOn && !agoraConfig) {
        setLoading(true);
        setError(null);
        try {
          const channel = await getDefaultChannel();
          const config = await generateHostToken(channel, 10);
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
  }, [screenShareOn, agoraConfig]);

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
