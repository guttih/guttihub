// components/Player/PlayerOverlay.tsx
import { PlayerClient } from "./PlayerClient";

export function PlayerOverlay({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex justify-center items-center">
      <div className="bg-white p-4 rounded shadow-lg w-full max-w-3xl">
        <button onClick={onClose} className="text-red-500 float-right mb-2">Close</button>
        <PlayerClient url={url} />
      </div>
    </div>
  );
}
