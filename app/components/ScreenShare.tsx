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
        setScreenVideoTrack(
          screenTrack.filter(
            (track: ILocalTrack) => track.trackMediaType === "video"
          )[0] as ILocalVideoTrack
        );
        setScreenAudioTrack(
          screenTrack.filter(
            (track: ILocalTrack) => track.trackMediaType === "audio"
          )[0] as ILocalAudioTrack
        );
      } else {
        setScreenVideoTrack(screenTrack);
      }
    }
  }, [screenTrack]);

  //publish screen share
  usePublish([screenVideoTrack, screenAudioTrack], screenShareOn, client);

  //screen share closed
  useTrackEvent(screenVideoTrack, "track-ended", () => {
    console.log("screen sharing ended");
    onCloseScreenShare?.();
  });

  return (
    <AgoraRTCProvider client={client}>
      <AgoraRTCScreenShareProvider client={client}>
        {screenShareOn && screenVideoTrack && (
          <LocalVideoTrack
            disabled={!screenShareOn}
            play={screenShareOn}
            style={{ width: "90vw", height: "90vh" }}
            track={screenVideoTrack}
          />
        )}
        {screenAudioTrack && (
          <LocalAudioTrack disabled={!screenShareOn} track={screenAudioTrack} />
        )}
      </AgoraRTCScreenShareProvider>
    </AgoraRTCProvider>
  );
};

export default ScreenShare;
