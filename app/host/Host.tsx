"use client";

import { useLocalScreenTrack } from "agora-rtc-react";
import dynamic from "next/dynamic";
import { Suspense, useState, useEffect } from "react";
import {
  generateHostToken,
  getDefaultChannel,
  type AgoraTokenConfig,
} from "@/lib/server-actions";

const ScreenShare = dynamic(() => import("@/app/components/ScreenShare"), {
  ssr: false,
});

export default function Host() {
  const [screenShareOn, setScreenShareOn] = useState(false);
  const [agoraConfig, setAgoraConfig] = useState<AgoraTokenConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Enable both video and audio capture for screen sharing
  const { screenTrack, error: screenError } = useLocalScreenTrack(
    screenShareOn,
    {
      // Screen video configuration
      optimizationMode: "detail",
      encoderConfig: "1080p_1",
    },
    "enable" // Enable audio capture
  );

  console.log("Host agoraConfig:", agoraConfig);
  console.log("Host screenTrack:", screenTrack);

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
      // Clear previous config to force token regeneration
      setAgoraConfig(null);
    }
    setScreenShareOn(!screenShareOn);
  };

  // Check if we have audio and video tracks
  const hasAudioTrack =
    screenTrack && Array.isArray(screenTrack) && screenTrack.length > 1;
  const hasVideoTrack = screenTrack !== null;

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
        <div className="mb-4 space-y-4 text-center">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md">
            <h2 className="text-2xl font-bold mb-4">🎥 Host Control Panel</h2>

            <button
              className="btn px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Track Status */}
            {screenShareOn && screenTrack && (
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
                        hasAudioTrack ? "text-green-400" : "text-red-400"
                      }
                    >
                      🔊 Audio: {hasAudioTrack ? "Active" : "Inactive"}
                    </div>
                  </div>
                </div>

                {!hasAudioTrack && (
                  <div className="bg-yellow-600 p-2 rounded text-xs">
                    ⚠️ No audio detected. Make sure to select "Share audio" when
                    sharing your screen.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-600 border border-red-400 text-white rounded max-w-md">
            {error}
          </div>
        )}

        {screenError && (
          <div className="mb-4 p-3 bg-red-600 border border-red-400 text-white rounded max-w-md">
            Screen share error: {screenError.message}
          </div>
        )}

        {agoraConfig && (
          <ScreenShare
            screenShareOn={screenShareOn}
            screenTrack={screenTrack}
            agoraConfig={agoraConfig}
            onCloseScreenShare={() => setScreenShareOn(false)}
          />
        )}
      </div>
    </Suspense>
  );
}
