import { M3UEntry } from "@/types/M3UEntry";
import { BaseButton } from "@/components/ui/BaseButton/BaseButton";
import { Card } from "@/components/ui/Card/Card";

interface Props {
    systemJobId: string;
  datetime: string;
  outputFile?: string;
  entry?: M3UEntry;
  onDelete: (id: string) => void;
}

export function ScheduledJobCard({ systemJobId, datetime, outputFile, entry, onDelete }: Props) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-bold text-white">
            {entry?.name || "Untitled stream"}
          </h2>
          <p className="text-sm text-gray-400">{entry?.groupTitle || "Unknown group"}</p>
        </div>
        <BaseButton
          variant="danger"
          size="sm"
          onClick={() => onDelete(systemJobId)}
          className="text-red-400 hover:text-red-500"
        >
          ✕
        </BaseButton>
      </div>

      <div className="text-sm text-gray-300">
        <p>
          <strong>Start:</strong> {new Date(datetime).toLocaleString(undefined, { hour12: false })}
        </p>
        {outputFile && (
          <p className="truncate">
            <strong>Output:</strong>{" "}
            <span className="font-mono text-xs text-gray-400">{outputFile}</span>
          </p>
        )}
      </div>
    </Card>
  );
}
