import clsx from "clsx";

interface MediaControlProps {
  calling?: boolean;
  micOn?: boolean;
  cameraOn?: boolean;
  setMic?: () => void;
  setCamera?: () => void;
  setCalling?: () => void;
}
/* Camera and Microphone Controls */
export const MediaControl = ({
  calling,
  micOn,
  cameraOn,
  setMic,
  setCamera,
  setCalling,
}: MediaControlProps) => (
  <>
    <div className="inset-0 top-a flex justify-center items-center gap-3 px-6 py-3 bg-#21242c c-coolgray-3">
      <div className="flex-1 flex top-0 left-0 h-full items-center gap-3 px-6 py-3">
        {setMic && (
          <button className="btn" onClick={() => setMic()}>
            {micOn ? <span>🔊</span> : <span>🔇</span>}
          </button>
        )}
        {setCamera && (
          <button className="btn" onClick={() => setCamera()}>
            {cameraOn ? <span>🎥</span> : <span>🚫</span>}
          </button>
        )}
      </div>
      {setCalling && (
        <button
          className={clsx("btn btn-phone", { "btn-phone-active": calling })}
          onClick={() => setCalling()}
        >
          {calling ? <span>🔴</span> : <span>⚫</span>}
        </button>
      )}
    </div>
  </>
);
