// src/components/UserMenuCommands/ForceRefreshButton.tsx
type Props = {
    onForceRefresh: () => void;
    tooltip?: string;
  };
  
  export const ForceRefreshButton = ({ onForceRefresh, tooltip }: Props) => (
    <button  
        onClick={onForceRefresh} 
        title={tooltip}
        className="w-full text-left px-4 py-2 hover:bg-gray-700"
        >
      🔄 Force Update 
    </button>
  );
  