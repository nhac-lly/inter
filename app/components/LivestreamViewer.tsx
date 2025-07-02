"use client";
import React, { useState } from "react";
import AgoraRTC, {
  AgoraRTCProvider,
  useJoin,
  useRemoteUsers,
  RemoteUser,
  useRemoteAudioTracks,
  IAgoraRTCClient,
} from "agora-rtc-react";
import { appConfig } from "@/config";

function LivestreamViewerInner({ client }: { client: IAgoraRTCClient }) {
  useJoin(
    {
      appid: appConfig.appId,
      channel: appConfig.channel,
      token: appConfig.token,
      uid: null,
    },
    true,
    client
  );

  const remoteUsers = useRemoteUsers();
  console.log([remoteUsers]);
  const { audioTracks } = useRemoteAudioTracks(remoteUsers);
  audioTracks.map((track) => track.play());
  const hostUser = remoteUsers.find((user) => !!user.videoTrack);

  return (
    <>
      {/* Stream Info */}
      <div className="mt-8 text-center">
        <div className="bg-gray-800 rounded-lg p-6 max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold mb-2">Welcome to the Stream!</h3>
          <p className="text-gray-300">
            Channel A. Invite others to join and watch together!
          </p>
        </div>
      </div>

      {/* Guest Counter */}
      <div className="flex justify-center mb-4">
        <div className="bg-green-600 px-4 py-2 rounded-full">
          <span className="text-sm font-semibold">
            👥 {remoteUsers.length} Guests
          </span>
        </div>
      </div>

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

export default function LivestreamViewer() {
  const [client] = useState(() =>
    AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })
  );

  return (
    <AgoraRTCProvider client={client}>
      <LivestreamViewerInner client={client} />
    </AgoraRTCProvider>
  );
}
