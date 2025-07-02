"use client";

import { useLocalScreenTrack } from "agora-rtc-react";
import dynamic from "next/dynamic";
import { Suspense, useState } from "react";

const ScreenShare = dynamic(() => import("@/app/components/ScreenShare"), {
  ssr: false,
});

export default function Host() {
  const [screenShareOn, setScreenShareOn] = useState(false);
  const { screenTrack, error } = useLocalScreenTrack(screenShareOn, {}, "auto");

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="flex flex-col items-center justify-center h-screen">
        <button
          className="btn"
          onClick={() => setScreenShareOn(!screenShareOn)}
        >
          {screenShareOn ? "Stop Screen Share" : "Start Screen Share"}
        </button>
        <ScreenShare screenShareOn={screenShareOn} screenTrack={screenTrack} />
        {error && <p className="text-red-500">{error.message}</p>}
      </div>
    </Suspense>
  );
}
