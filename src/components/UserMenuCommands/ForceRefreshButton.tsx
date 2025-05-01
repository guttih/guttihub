// src/components/UserMenuCommands/ForceRefreshButton.tsx
type Props = {
    onForceRefresh: () => void;
  };
  
  export const ForceRefreshButton = ({ onForceRefresh }: Props) => (
    <button onClick={onForceRefresh} className="w-full text-left px-4 py-2 hover:bg-gray-700">
      🔄 Force Update
    </button>
  );
  