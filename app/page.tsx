"use client";

import { useEffect, useState } from "react";
import {
  generateViewerToken,
  getDefaultChannel,
  type AgoraTokenConfig,
} from "@/lib/server-actions";
import dynamic from "next/dynamic";

// Dynamically import the livestream viewer to avoid SSR issues
const LivestreamViewer = dynamic(
  () => import("@/app/components/LivestreamViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📺</div>
          <p className="text-gray-300">Loading stream...</p>
        </div>
      </div>
    ),
  }
);

export default function ViewerPage() {
  const [agoraConfig, setAgoraConfig] = useState<AgoraTokenConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateToken = async () => {
      setLoading(true);
      setError(null);
      try {
        const channel = await getDefaultChannel();
        const config = await generateViewerToken(channel, null);
        setAgoraConfig(config);
      } catch (err) {
        console.error("Failed to generate viewer token:", err);
        setError("Failed to generate authentication token");
      } finally {
        setLoading(false);
      }
    };

    generateToken();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating authentication token...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Authentication Error
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!agoraConfig) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600">No configuration available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Live Stream Viewer</h1>
          <div className="text-sm text-gray-400">
            Channel: {agoraConfig.channel} | UID: {agoraConfig.uid}
          </div>
        </div>
      </header>

      <main>
        <LivestreamViewer agoraConfig={agoraConfig} />
      </main>
    </div>
  );
}
