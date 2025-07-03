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

  const { screenTrack, error: screenError } = useLocalScreenTrack(
    screenShareOn,
    {},
    "auto"
  );

  console.log(agoraConfig);

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

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="mb-4 space-y-2">
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
            <div className="text-sm text-gray-600 bg-gray-100 p-2 rounded">
              Channel: {agoraConfig.channel} | UID: {agoraConfig.uid}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {screenError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
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
