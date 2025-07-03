"use client";

import AgoraRTC from "agora-rtc-react";
import { useLocalMicrophoneTrack } from "agora-rtc-react";
import { useState, useEffect, useRef } from "react";
import type { ILocalAudioTrack } from "agora-rtc-react";

interface AudioMixerProps {
  screenAudio?: ILocalAudioTrack | null;
  onMixedAudioChange: (mixedTrack: ILocalAudioTrack | null) => void;
  enabled: boolean;
}

export function AudioMixer({
  screenAudio,
  onMixedAudioChange,
  enabled,
}: AudioMixerProps) {
  const [micEnabled, setMicEnabled] = useState(false);
  const [micVolume, setMicVolume] = useState(0.8);
  const [screenVolume, setScreenVolume] = useState(0.6);
  const [isInitialized, setIsInitialized] = useState(false);

  // Microphone track
  const { localMicrophoneTrack } = useLocalMicrophoneTrack(
    micEnabled && enabled
  );

  // Audio context and mixer refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const mixerRef = useRef<GainNode | null>(null);
  const screenSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const screenGainRef = useRef<GainNode | null>(null);
  const micGainRef = useRef<GainNode | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const mixedTrackRef = useRef<ILocalAudioTrack | null>(null);

  // Initialize audio context and mixer
  useEffect(() => {
    if (enabled && !isInitialized) {
      initializeAudioMixer();
      setIsInitialized(true);
    }

    return () => {
      if (!enabled) {
        cleanupAudioMixer();
        setIsInitialized(false);
      }
    };
  }, [enabled, isInitialized]);

  // Update mixer when audio sources change
  useEffect(() => {
    if (isInitialized && audioContextRef.current) {
      updateMixer();
    }
  }, [screenAudio, localMicrophoneTrack, micEnabled, isInitialized]);

  // Update volumes
  useEffect(() => {
    if (screenGainRef.current) {
      screenGainRef.current.gain.value = screenVolume;
    }
  }, [screenVolume]);

  useEffect(() => {
    if (micGainRef.current) {
      micGainRef.current.gain.value = micVolume;
    }
  }, [micVolume]);

  const initializeAudioMixer = async () => {
    try {
      // Create audio context
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const ctx = audioContextRef.current;

      // Create mixer nodes
      mixerRef.current = ctx.createGain();
      screenGainRef.current = ctx.createGain();
      micGainRef.current = ctx.createGain();
      destinationRef.current = ctx.createMediaStreamDestination();

      // Set initial volumes
      screenGainRef.current.gain.value = screenVolume;
      micGainRef.current.gain.value = micVolume;

      // Connect the mixer
      screenGainRef.current.connect(mixerRef.current);
      micGainRef.current.connect(mixerRef.current);
      mixerRef.current.connect(destinationRef.current);

      console.log("Audio mixer initialized");
    } catch (error) {
      console.error("Failed to initialize audio mixer:", error);
    }
  };

  const updateMixer = async () => {
    if (!audioContextRef.current || !destinationRef.current) return;

    const ctx = audioContextRef.current;

    // Disconnect old sources
    if (screenSourceRef.current) {
      screenSourceRef.current.disconnect();
      screenSourceRef.current = null;
    }
    if (micSourceRef.current) {
      micSourceRef.current.disconnect();
      micSourceRef.current = null;
    }

    // Connect screen audio if available
    if (screenAudio) {
      try {
        const screenMediaStream = screenAudio.getMediaStreamTrack();
        if (screenMediaStream) {
          const screenStream = new MediaStream([screenMediaStream]);
          screenSourceRef.current = ctx.createMediaStreamSource(screenStream);
          screenSourceRef.current.connect(screenGainRef.current!);
          console.log("Screen audio connected to mixer");
        }
      } catch (error) {
        console.error("Failed to connect screen audio:", error);
      }
    }

    // Connect microphone if available
    if (localMicrophoneTrack && micEnabled) {
      try {
        const micMediaStream = localMicrophoneTrack.getMediaStreamTrack();
        if (micMediaStream) {
          const micStream = new MediaStream([micMediaStream]);
          micSourceRef.current = ctx.createMediaStreamSource(micStream);
          micSourceRef.current.connect(micGainRef.current!);
          console.log("Microphone connected to mixer");
        }
      } catch (error) {
        console.error("Failed to connect microphone:", error);
      }
    }

    // Create mixed audio track
    if (destinationRef.current) {
      try {
        // Clean up previous track
        if (mixedTrackRef.current) {
          mixedTrackRef.current.close();
        }

        const audioTrack = destinationRef.current.stream.getAudioTracks()[0];
        if (audioTrack) {
          mixedTrackRef.current = AgoraRTC.createCustomAudioTrack({
            mediaStreamTrack: audioTrack,
          });
          onMixedAudioChange(mixedTrackRef.current);
          console.log("Mixed audio track created");
        } else {
          onMixedAudioChange(null);
        }
      } catch (error) {
        console.error("Failed to create mixed audio track:", error);
        onMixedAudioChange(null);
      }
    }
  };

  const cleanupAudioMixer = () => {
    if (screenSourceRef.current) {
      screenSourceRef.current.disconnect();
      screenSourceRef.current = null;
    }
    if (micSourceRef.current) {
      micSourceRef.current.disconnect();
      micSourceRef.current = null;
    }
    if (mixedTrackRef.current) {
      mixedTrackRef.current.close();
      mixedTrackRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    onMixedAudioChange(null);
    console.log("Audio mixer cleaned up");
  };

  const toggleMicrophone = () => {
    setMicEnabled(!micEnabled);
  };

  const hasScreenAudio = !!screenAudio;
  const hasMicAudio = !!(localMicrophoneTrack && micEnabled);
  const hasAnyAudio = hasScreenAudio || hasMicAudio;

  if (!enabled) return null;

  return (
    <div className="bg-gray-700 p-4 rounded-lg space-y-4">
      <div className="text-sm font-semibold text-white">🎚️ Audio Mixer</div>

      {/* Audio Sources Status */}
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div
          className={`p-2 rounded ${
            hasScreenAudio ? "bg-green-600" : "bg-gray-600"
          }`}
        >
          <div className="font-semibold">🖥️ Screen Audio</div>
          <div>{hasScreenAudio ? "Connected" : "Not Available"}</div>
        </div>
        <div
          className={`p-2 rounded ${
            hasMicAudio ? "bg-green-600" : "bg-gray-600"
          }`}
        >
          <div className="font-semibold">🎤 Microphone</div>
          <div>
            {hasMicAudio
              ? "Connected"
              : micEnabled
              ? "Connecting..."
              : "Disabled"}
          </div>
        </div>
      </div>

      {/* Microphone Control */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-300">Microphone:</span>
        <button
          onClick={toggleMicrophone}
          className={`px-3 py-1 rounded text-xs font-semibold ${
            micEnabled
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gray-600 hover:bg-gray-500"
          }`}
        >
          {micEnabled ? "🎤 ON" : "🎤 OFF"}
        </button>
      </div>

      {/* Volume Controls */}
      {hasScreenAudio && (
        <div className="space-y-2">
          <label className="text-xs text-gray-300">Screen Audio Volume:</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={screenVolume}
            onChange={(e) => setScreenVolume(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
          <div className="text-xs text-gray-400 text-center">
            {Math.round(screenVolume * 100)}%
          </div>
        </div>
      )}

      {micEnabled && (
        <div className="space-y-2">
          <label className="text-xs text-gray-300">Microphone Volume:</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={micVolume}
            onChange={(e) => setMicVolume(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
          <div className="text-xs text-gray-400 text-center">
            {Math.round(micVolume * 100)}%
          </div>
        </div>
      )}

      {/* Mixed Audio Status */}
      <div
        className={`p-2 rounded text-xs ${
          hasAnyAudio ? "bg-blue-600" : "bg-gray-600"
        }`}
      >
        <div className="font-semibold">🔊 Mixed Output</div>
        <div>
          {hasAnyAudio
            ? "Audio is being mixed and broadcast"
            : "No audio sources active"}
        </div>
      </div>
    </div>
  );
}
