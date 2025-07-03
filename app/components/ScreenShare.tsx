"use client";

import type {
  ILocalAudioTrack,
  ILocalTrack,
  ILocalVideoTrack,
} from "agora-rtc-react";
import AgoraRTC, {
  AgoraRTCProvider,
  AgoraRTCScreenShareProvider,
  LocalAudioTrack,
  LocalVideoTrack,
  useJoin,
  usePublish,
  useTrackEvent,
} from "agora-rtc-react";
import { useEffect, useState } from "react";
import type { AgoraTokenConfig } from "@/lib/server-actions";

interface ShareScreenProps {
  screenShareOn: boolean;
  screenTrack: ILocalVideoTrack | [ILocalVideoTrack, ILocalAudioTrack] | null;
  agoraConfig: AgoraTokenConfig;
  onCloseScreenShare?: () => void;
}

export const ScreenShare = ({
  screenShareOn,
  screenTrack,
  agoraConfig,
  onCloseScreenShare,
}: ShareScreenProps) => {
  const [client] = useState(() => {
    const agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

    // Set client role as host for broadcasting
    agoraClient.setClientRole("host");

    // Add event listeners for debugging
    agoraClient.on("user-joined", (user) => {
      console.log(`User ${user.uid} joined the channel`);
    });

    agoraClient.on("user-left", (user) => {
      console.log(`User ${user.uid} left the channel`);
    });

    return agoraClient;
  });

  //screen share
  const [screenVideoTrack, setScreenVideoTrack] =
    useState<ILocalVideoTrack | null>(null);
  const [screenAudioTrack, setScreenAudioTrack] =
    useState<ILocalAudioTrack | null>(null);

  //join room using server-generated config
  useJoin(
    {
      appid: agoraConfig.appId,
      channel: agoraConfig.channel,
      token: agoraConfig.token,
      uid: agoraConfig.uid,
    },
    screenShareOn,
    client
  );

  //get screen share video track and audio track
  useEffect(() => {
    if (!screenTrack) {
      setScreenAudioTrack(null);
      setScreenVideoTrack(null);
    } else {
      if (Array.isArray(screenTrack)) {
        const videoTrack = screenTrack.filter(
          (track: ILocalTrack) => track.trackMediaType === "video"
        )[0] as ILocalVideoTrack;

        const audioTrack = screenTrack.filter(
          (track: ILocalTrack) => track.trackMediaType === "audio"
        )[0] as ILocalAudioTrack;

        setScreenVideoTrack(videoTrack);
        setScreenAudioTrack(audioTrack);

        console.log("Screen tracks:", {
          hasVideo: !!videoTrack,
          hasAudio: !!audioTrack,
        });
      } else {
        setScreenVideoTrack(screenTrack);
        console.log("Screen track (video only):", { hasVideo: !!screenTrack });
      }
    }
  }, [screenTrack]);

  //publish screen share - ensure both video and audio are published
  const tracksToPublish = [screenVideoTrack, screenAudioTrack].filter(Boolean);
  usePublish(tracksToPublish, screenShareOn, client);

  // Log publishing status
  useEffect(() => {
    if (screenShareOn && tracksToPublish.length > 0) {
      console.log(`Publishing ${tracksToPublish.length} tracks:`, {
        video: !!screenVideoTrack,
        audio: !!screenAudioTrack,
      });
    }
  }, [
    screenShareOn,
    tracksToPublish.length,
    screenVideoTrack,
    screenAudioTrack,
  ]);

  //screen share closed
  useTrackEvent(screenVideoTrack, "track-ended", () => {
    console.log("screen sharing ended");
    onCloseScreenShare?.();
  });

  return (
    <AgoraRTCProvider client={client}>
      <AgoraRTCScreenShareProvider client={client}>
        {/* Video Track Display */}
        {screenShareOn && screenVideoTrack && (
          <div className="relative">
            <LocalVideoTrack
              disabled={!screenShareOn}
              play={screenShareOn}
              style={{ width: "90vw", height: "90vh" }}
              track={screenVideoTrack}
            />
            {/* Audio indicator */}
            <div className="absolute top-4 right-4 bg-black bg-opacity-50 px-3 py-1 rounded-full">
              <span className="text-sm font-semibold text-white">
                {screenAudioTrack ? "🔊 Audio Enabled" : "🔇 No Audio"}
              </span>
            </div>
          </div>
        )}

        {/* Audio Track - Hidden but still published */}
        {screenAudioTrack && (
          <LocalAudioTrack disabled={!screenShareOn} track={screenAudioTrack} />
        )}

        {/* Publishing Status */}
        {screenShareOn && (
          <div className="mt-4 text-center">
            <div className="bg-gray-800 px-4 py-2 rounded-lg text-sm">
              📡 Broadcasting: Video {screenVideoTrack ? "✅" : "❌"} | Audio{" "}
              {screenAudioTrack ? "✅" : "❌"}
            </div>
          </div>
        )}
      </AgoraRTCScreenShareProvider>
    </AgoraRTCProvider>
  );
};

export default ScreenShare;
