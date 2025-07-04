"use client";
import React, { useState, useEffect } from "react";
import AgoraRTC, {
  AgoraRTCProvider,
  useJoin,
  useRemoteUsers,
  RemoteUser,
  useRemoteAudioTracks,
  useRemoteVideoTracks,
  IAgoraRTCClient,
} from "agora-rtc-react";
import type { AgoraTokenConfig } from "@/lib/server-actions";

interface LivestreamViewerProps {
  agoraConfig: AgoraTokenConfig;
}

function LivestreamViewerInner({
  client,
  agoraConfig,
}: {
  client: IAgoraRTCClient;
  agoraConfig: AgoraTokenConfig;
}) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  useJoin(
    {
      appid: agoraConfig.appId,
      channel: agoraConfig.channel,
      token: agoraConfig.token,
      uid: agoraConfig.uid,
    },
    true,
    client
  );

  const remoteUsers = useRemoteUsers();
  console.log("Remote users:", remoteUsers);

  const { audioTracks } = useRemoteAudioTracks(remoteUsers);
  const { videoTracks } = useRemoteVideoTracks(remoteUsers);

  // Handle audio playback with user interaction
  useEffect(() => {
    if (audioTracks.length > 0 && userInteracted) {
      audioTracks.forEach(async (track) => {
        try {
          await track.play();
          console.log(`Playing audio track from user ${track.getUserId()}`);
          setAudioEnabled(true);
        } catch (error) {
          console.error("Failed to play audio track:", error);
          // Audio autoplay blocked - user interaction required
          setAudioEnabled(false);
        }
      });
    }
  }, [audioTracks, userInteracted]);

  // Log video tracks for debugging
  useEffect(() => {
    console.log("Video tracks:", videoTracks);
    console.log("Audio tracks:", audioTracks);
  }, [videoTracks, audioTracks]);

  const hostUser = remoteUsers.find((user) => !!user.videoTrack);

  // Enable audio with user interaction
  const enableAudio = async () => {
    setUserInteracted(true);
    if (audioTracks.length > 0) {
      try {
        for (const track of audioTracks) {
          await track.play();
          console.log(`Enabled audio for user ${track.getUserId()}`);
        }
        setAudioEnabled(true);
      } catch (error) {
        console.error("Failed to enable audio:", error);
      }
    }
  };

  const toggleAudio = async () => {
    if (!userInteracted) {
      enableAudio();
      return;
    }

    if (audioEnabled) {
      // Mute audio
      audioTracks.forEach((track) => {
        track.stop();
      });
      setAudioEnabled(false);
    } else {
      // Unmute audio
      audioTracks.forEach(async (track) => {
        try {
          await track.play();
        } catch (error) {
          console.error("Failed to play audio:", error);
        }
      });
      setAudioEnabled(true);
    }
  };

  return (
    <>
      {/* Stream Info */}
      <div className="mt-8 text-center">
        <div className="bg-gray-800 rounded-lg p-6 max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold mb-2">Welcome to the Stream!</h3>
          <p className="text-gray-300">
            Channel {agoraConfig.channel}. Invite others to join and watch
            together!
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center mb-4 space-x-4">
        {/* Guest Counter */}
        <div className="bg-green-600 px-4 py-2 rounded-full">
          <span className="text-sm font-semibold">
            👥 {remoteUsers.length} Guests Connected
          </span>
        </div>

        {/* Audio Control */}
        {audioTracks.length > 0 && (
          <button
            onClick={toggleAudio}
            className={`px-4 py-2 rounded-full text-sm font-semibold ${
              audioEnabled
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {audioEnabled ? "🔊 Audio On" : "🔇 Enable Audio"}
          </button>
        )}
      </div>

      {/* Debug Info */}
      <div className="flex justify-center mb-4">
        <div className="bg-blue-600 px-4 py-2 rounded-full text-xs">
          Video: {videoTracks.length} | Audio: {audioTracks.length} |
          {audioEnabled ? " 🔊 Playing" : " 🔇 Muted"}
        </div>
      </div>

      {/* Audio Permission Notice */}
      {audioTracks.length > 0 && !userInteracted && (
        <div className="flex justify-center mb-4">
          <div className="bg-yellow-600 px-4 py-2 rounded-lg text-sm">
            Click "Enable Audio" to hear the stream audio
          </div>
        </div>
      )}

      {/* Main Stream */}
      <div className="flex justify-center items-center">
        <div className="w-full">
          {hostUser ? (
            <div className="relative">
              <RemoteUser
                user={hostUser}
                style={{
                  width: "90vw",
                  height: "90vh",
                  margin: "0 auto",
                  background: "black",
                }}
              />
              <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 rounded-full">
                <span className="text-sm font-semibold">🔴 LIVE</span>
              </div>
              {/* Audio indicator */}
              {audioTracks.length > 0 && (
                <div className="absolute top-4 right-4 bg-black bg-opacity-50 px-3 py-1 rounded-full">
                  <span className="text-sm font-semibold">
                    {audioEnabled ? "🔊" : "🔇"}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-[500px] bg-gray-800 rounded-xl flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-600">
              <div className="text-6xl mb-4">📺</div>
              <h3 className="text-2xl font-semibold mb-2">No Stream Active</h3>
              <p className="text-gray-500">
                Waiting for host to start streaming...
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function LivestreamViewer({
  agoraConfig,
}: LivestreamViewerProps) {
  const [client] = useState(() => {
    const agoraClient = AgoraRTC.createClient({ mode: "live", codec: "h265" });

    // Add event listeners for debugging
    agoraClient.on("user-published", (user, mediaType) => {
      console.log(`User ${user.uid} published ${mediaType}`);
    });

    agoraClient.on("user-unpublished", (user, mediaType) => {
      console.log(`User ${user.uid} unpublished ${mediaType}`);
    });

    return agoraClient;
  });

  return (
    <AgoraRTCProvider client={client}>
      <LivestreamViewerInner client={client} agoraConfig={agoraConfig} />
    </AgoraRTCProvider>
  );
}
