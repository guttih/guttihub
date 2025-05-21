// src/components/cards/EnrichedScheduledJobCard/EnrichedScheduledJobCard.tsx

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card/Card";
import { BaseButton } from "@/components/ui/BaseButton/BaseButton";
import { ScheduledJobEnriched } from "@/types/ScheduledJob";
import { formatDuration } from "@/utils/ui/formatDuration";
import { EnrichedUpdatePayload } from "@/types/AllowedJobUpdateFields";

interface Props {
    job: ScheduledJobEnriched;
    onDelete?: (id: string) => void;
    onSave?: (payload: EnrichedUpdatePayload) => void;
}

export function EnrichedScheduledJobCard({ job, onDelete, onSave }: Props) {
    const [expanded, setExpanded] = useState(false);
    const [editing, setEditing] = useState(false);

    // Editable fields
    const [editedDatetime, setEditedDatetime] = useState(job.datetime);
    const [editedDuration, setEditedDuration] = useState(job.duration);
    const [editedName, setEditedName] = useState(job.entry?.name || "");

    const [editedEndTime, setEditedEndTime] = useState(new Date(new Date(editedDatetime).getTime() + editedDuration * 1000));
    useEffect(() => {
        setEditedEndTime(new Date(new Date(editedDatetime).getTime() + editedDuration * 1000));
    }, [editedDatetime, editedDuration]);

    const handleEndTimeChange = (value: string) => {
        const newEnd = new Date(`${new Date(editedDatetime).toDateString()} ${value}`);
        const newDuration = Math.floor((newEnd.getTime() - new Date(editedDatetime).getTime()) / 1000);

        if (newDuration > 0) {
            setEditedDuration(newDuration);
            setEditedEndTime(newEnd);
        }
    };

    useEffect(() => {
        setEditedDatetime(job.datetime);
        setEditedDuration(job.duration);
        setEditedName(job.entry?.name || "");
    }, [job]);

    const { systemJobId, datetime, duration, entry } = job;

    const handleSave = () => {
            onSave?.({
                systemJobId: job.systemJobId,
                cacheKey: job.cacheKey,
                updatedFields: {
                    datetime: editedDatetime,
                    duration: editedDuration,
                    entryName: editedName,
                },
            });

        setEditing(false);
    };

    return (
        <Card className="w-full p-4 space-y-2">
            <div className="flex justify-between items-start w-full">
                {/* Left: Title + Time Info */}
                <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-white truncate">{entry?.name || "Untitled Stream"}</h2>
                    <div className="text-sm text-gray-400 mt-1 flex flex-wrap gap-4">
                        <span>{new Date(datetime).toLocaleString(undefined, { hour12: false })}</span>
                        <span>Ends {new Date(new Date(datetime).getTime() + duration * 1000).toLocaleTimeString(undefined, { hour12: false })}</span>
                        <span>{formatDuration(duration)}</span>
                    </div>
                </div>

                {/* Right: Logo + Buttons */}
                <div className="flex items-center gap-2">
                    {entry?.tvgLogo && entry.tvgLogo && entry.tvgLogo.length>5 && <img src={entry.tvgLogo} alt="Logo" className="h-8 w-8 rounded-md object-contain shrink-0 mr-3" />}
                    {expanded && editing ? (
                        <>
                            <BaseButton variant="secondary" size="sm" onClick={() => setEditing(false)}>
                                Cancel
                            </BaseButton>
                            <BaseButton variant="success" size="sm" onClick={handleSave}>
                                Save
                            </BaseButton>
                        </>
                    ) : (
                        <>
                            {expanded && (
                                <div className="flex gap-2">
                                    <BaseButton variant="danger" size="sm" onClick={() => onDelete?.(systemJobId)} className="text-sm">
                                        ✕
                                    </BaseButton>
                                    <BaseButton variant="default" size="sm" onClick={() => setEditing(true)}>
                                        Edit
                                    </BaseButton>
                                </div>
                            )}
                            <BaseButton variant="default" size="sm" onClick={() => setExpanded((prev) => !prev)}>
                                {expanded ? "Less" : "More"}
                            </BaseButton>
                        </>
                    )}
                </div>
            </div>

            {expanded && !editing && (
                <div className="text-sm text-gray-300 space-y-1 pt-2 border-t border-gray-700 mt-2">
                    <p>
                        <strong>Description:</strong> {job.description || <em className="text-gray-500">No description</em>}{" "}
                    </p>
                    <p>
                        <strong>User:</strong> {job.user}
                    </p>
                    <p>
                        <strong>Cache Key:</strong> {job.cacheKey}
                    </p>
                    <p>
                        <strong>Output File:</strong> {job.outputFile}
                    </p>
                    <p>
                        <strong>Recording Type:</strong> {job.recordingType}
                    </p>
                    <p>
                        <strong>Format:</strong> {job.format}
                    </p>
                    <p>
                        <strong>Command:</strong> <code className="text-xs break-words">{job.command}</code>
                    </p>

                    {entry && (
                        <>
                            <hr className="border-gray-700 my-2" />
                            <p>
                                <strong>Stream Name:</strong> {entry.name}
                            </p>
                            <p>
                                <strong>TVG Name:</strong> {entry.tvgName}
                            </p>
                            <p>
                                <strong>TVG ID:</strong> {entry.tvgId}
                            </p>
                            <p>
                                <strong>Group:</strong> {entry.groupTitle}
                            </p>
                            <p>
                                <strong>Logo:</strong>{" "}
                                {entry.tvgLogo ? (
                                    <img src={entry.tvgLogo} alt="Logo" className="h-6 inline ml-2" />
                                ) : (
                                    <span className="text-gray-500">None</span>
                                )}
                            </p>
                            <p>
                                <strong>Stream URL:</strong>{" "}
                                <a href={entry.url} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                                    {entry.url}
                                </a>
                            </p>
                        </>
                    )}
                </div>
            )}
            {expanded &&
                (editing ? (
                    <div className="text-sm text-gray-300 space-y-2 pt-2 border-t border-gray-700 mt-2">
                        {/* Editable Field Group (Start Time + Duration side by side) */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <label className="form-label flex-1">
                                Start Time
                                <input
                                    type="datetime-local"
                                    value={new Date(editedDatetime).toISOString().slice(0, 16)}
                                    onChange={(e) => setEditedDatetime(new Date(e.target.value).toISOString())}
                                    className="form-input w-full"
                                />
                            </label>

                            <label className="form-label w-32">
                                Duration (s)
                                <input
                                    type="number"
                                    value={editedDuration}
                                    onChange={(e) => setEditedDuration(Number(e.target.value))}
                                    className="form-input w-full"
                                    min={1}
                                />
                            </label>

                            <label className="form-label flex-1">
                                End Time
                                <input
                                    type="time"
                                    step="1"
                                    value={editedEndTime.toTimeString().slice(0, 8)}
                                    onChange={(e) => handleEndTimeChange(e.target.value)}
                                    className="form-input w-full"
                                />
                            </label>
                        </div>

                        <label className="block">
                            <span className="text-gray-400">Stream Name</span>
                            <input type="text" value={editedName} onChange={(e) => setEditedName(e.target.value)} className="form-input" />
                        </label>

                        <p className="text-gray-500 pt-2">
                            <strong>End Time:</strong>{" "}
                            {new Date(new Date(editedDatetime).getTime() + editedDuration * 1000).toLocaleString(undefined, { hour12: false })}
                        </p>
                    </div>
                ) : (
                    <div className="text-sm text-gray-300 space-y-1 pt-2 border-t border-gray-700 mt-2">
                        {/* original read-only expanded content here */}
                        ...
                    </div>
                ))}
        </Card>
    );
}
