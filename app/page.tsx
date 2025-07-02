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

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Main Stream Component */}
      <LivestreamViewer />
    </div>
  );
}
