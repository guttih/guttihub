"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { M3UEntry } from "@/types/M3UEntry";
import { M3UEntryFieldLabel } from "@/types/M3UEntryFieldLabel";
import { StreamingService } from "@/types/StreamingService";
import { services } from "@/config";
import { StreamCard } from "@/components/StreamCard/StreamCard";
import { StreamFormat } from "@/types/StreamFormat";
import { appConfig } from "@/config";
import { ContentCategoryFieldLabel } from "@/types/ContentCategoryFieldLabel";
import { useDebouncedState } from "./hooks/useDebouncedState";
import { ApiResponse } from "@/types/ApiResponse";
import { M3UResponse } from "@/types/M3UResponse";
import StreamCardInteractive from "@/components/StreamCardInteractive/StreamCardInteractive";
import { InlinePlayer } from "@/components/InlinePlayer/InlinePlayer";
import { FetchM3URequest } from "@/types/FetchM3URequest";
import { FilterInput } from "@/components/FilterInput/FilterInput";

export default function HomePage() {
    const [entries, setEntries] = useState<M3UEntry[]>([]);
    const [searchNameInput, setSearchNameInput] = useState("");
    const [searchGroupInput, setSearchGroupInput] = useState("");
    const [searchTvgIdInput, setSearchTvgIdInput] = useState("");
    const [player, setPlayer] = useState<{
        url: string;
        mode: "popup" | "inline";
        visible: boolean;
    }>({
        url: "",
        mode: "popup",
        visible: false,
    });

    const searchName = useDebouncedState(searchNameInput, 1000);
    const searchTvgId = useDebouncedState(searchTvgIdInput, 1000);
    const searchGroup = useDebouncedState(searchGroupInput, 1000);
    const [searchFormat, setSearchFormat] = useState<StreamFormat | "">("");
    const [searchCategory, setSearchCategory] = useState<ContentCategoryFieldLabel | "">("");
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [useInteractiveCard, setUseInteractiveCard] = useState(false);
    const [playerMode, setPlayerMode] = useState<"inline" | "popup">("popup");
    const [popupPosition, setPopupPosition] = useState({ x: 100, y: 100 });
    const [popupSize, setPopupSize] = useState({ width: 480, height: 270 });
    const [snapshotId, setSnapshotId] = useState("");
    const [focusedInput, setFocusedInput] = useState<string | null>(null);

    const [activeService, setActiveService] = useState<StreamingService | null>(null);
    const [totalEntries, setTotalEntries] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [inputModes, setInputModes] = useState<Record<string, { isRegex: boolean; isCaseSensitive: boolean }>>({
        searchName: { isRegex: false, isCaseSensitive: false },
        searchGroup: { isRegex: false, isCaseSensitive: false },
        searchTvgId: { isRegex: false, isCaseSensitive: false },
    });

    const debouncedFilters = useMemo(
        () => ({
            name: {
                value: searchName,
                isRegex: inputModes.searchName.isRegex,
                isCaseSensitive: inputModes.searchName.isCaseSensitive,
            },
            groupTitle: {
                value: searchGroup,
                isRegex: inputModes.searchGroup.isRegex,
                isCaseSensitive: inputModes.searchGroup.isCaseSensitive,
            },
            tvgId: {
                value: searchTvgId,
                isRegex: inputModes.searchTvgId.isRegex,
                isCaseSensitive: inputModes.searchTvgId.isCaseSensitive,
            },
            format: searchFormat || undefined,
            category: searchCategory || undefined,
        }),
        [searchName, searchGroup, searchTvgId, searchFormat, searchCategory, inputModes]
    );

    /*
// for later if we want to know if we are debouncing
const isDebouncing = searchNameInput !== searchName ||
                     searchGroupInput !== searchGroup ||
                     searchTvgIdInput !== searchTvgId;
*/

    const pageSize = Number(appConfig.defaultPageSize);

    const [filtering, setIsFiltering] = useState(false);

    useEffect(() => {
        setIsFiltering(true);

        const timer = setTimeout(() => {
            setIsFiltering(false);
        }, 10); // Small timeout lets UI commit changes

        return () => clearTimeout(timer);
    }, [searchName, searchGroup, searchTvgId, searchFormat, searchCategory, entries]);

    function handlePlay(url: string) {
        setPlayer({ url, mode: playerMode, visible: true });
    }

    function handleClosePlayer() {
        setPlayer((prev) => ({ ...prev, visible: false }));
    }

    function toggleInputMode(name: string, key: "isRegex" | "isCaseSensitive") {
        setInputModes((prev) => ({
            ...prev,
            [name]: { ...prev[name], [key]: !prev[name][key] },
        }));
    }

    const handleFetch = useCallback(
        async (service: StreamingService | null = activeService) => {
            if (!service) return;

            setActiveService(service);
            setLoading(true);

            try {
                const requestBody: FetchM3URequest = {
                    url: service.refreshUrl,
                    snapshotId,
                    pagination: {
                        offset: (currentPage - 1) * pageSize,
                        limit: pageSize,
                    },
                    filters: debouncedFilters,
                };

                const res = await fetch("/api/fetch-m3u", {
                    method: "POST",
                    body: JSON.stringify(requestBody),
                });

                const json: ApiResponse<M3UResponse> = await res.json();

                if (!json.success) {
                    alert(`Failed to load: ${json.error}`);
                    return;
                }

                setSnapshotId(json.data.snapshotId);
                setEntries(json.data.entries);

                setTotalEntries(json.data.totalItems);
                setTotalPages(json.data.totalPages);
            } catch (err) {
                console.error("Fetch failed", err);
            } finally {
                setLoading(false);
            }
        },
        [activeService, currentPage, debouncedFilters, pageSize, snapshotId]
    );

    useEffect(() => {
        if (!loading && focusedInput) {
            const el = document.querySelector<HTMLInputElement>(`input[name="${focusedInput}"]`);
            if (el && !el.disabled) {
                el.focus();
                el.setSelectionRange(el.value.length, el.value.length);
            }
        }
    }, [loading, focusedInput]);

    useEffect(() => {
        if (activeService) {
            handleFetch(activeService);
        }
    }, [currentPage, activeService, debouncedFilters, handleFetch]);

    useEffect(() => {
        if (!activeService) return;
        setCurrentPage((prev) => (prev === 1 ? prev : 1));
    }, [activeService, debouncedFilters]);

    function generateM3U(entries: M3UEntry[]): string {
        const lines = ["#EXTM3U"];
        for (const entry of entries) {
            const { tvgId, tvgName, tvgLogo, groupTitle, name, url } = entry;
            const meta = [`tvg-id="${tvgId}"`, `tvg-name="${tvgName}"`, `tvg-logo="${tvgLogo}"`, `group-title="${groupTitle}"`].join(" ");
            lines.push(`#EXTINF:-1 ${meta},${name}`);
            lines.push(url);
        }
        return lines.join("\n");
    }

    function handleExport() {
        const m3uContent = generateM3U(entries);
        const blob = new Blob([m3uContent], { type: "audio/x-mpegurl" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "playlist.m3u";
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <main className="p-4">
            <h1 className="text-xl font-bold mb-4">{appConfig.appName}</h1>
            <div className="flex items-center gap-3 mb-4">
                <label htmlFor="serviceSelect" className="text-white">
                    Select Service:
                </label>
                <select
                    id="serviceSelect"
                    value={activeService?.id ?? ""}
                    onChange={(e) => {
                        const selected = services.find((s) => s.id === e.target.value);
                        if (selected) {
                            setActiveService(selected);
                            setCurrentPage(1); // resets to page 1
                            handleFetch(selected);
                        }
                    }}
                    disabled={loading}
                    className="px-4 py-2 bg-gray-800 text-white border border-gray-600 rounded"
                >
                    <option value="" disabled>
                        Select a service...
                    </option>
                    {services.map((service) => (
                        <option key={service.id} value={service.id}>
                            {service.name}
                        </option>
                    ))}
                </select>

                {(loading || filtering) && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            </div>

            <div className="flex flex-wrap gap-2 items-center my-4">
                <FilterInput
                    name="searchName"
                    label={M3UEntryFieldLabel.name}
                    value={searchNameInput}
                    onChange={setSearchNameInput}
                    mode={inputModes.searchName}
                    onToggle={toggleInputMode}
                    loading={loading}
                    onFocus={(e) => setFocusedInput(e.currentTarget.name)}
                    onBlur={() => setFocusedInput(null)}
                />
                <FilterInput
                    name="searchGroup"
                    label={M3UEntryFieldLabel.groupTitle}
                    value={searchGroupInput}
                    onChange={setSearchGroupInput}
                    mode={inputModes.searchGroup}
                    onToggle={toggleInputMode}
                    loading={loading}
                    onFocus={(e) => setFocusedInput(e.currentTarget.name)}
                    onBlur={() => setFocusedInput(null)}
                />

                <FilterInput
                    name="searchTvgId"
                    label={M3UEntryFieldLabel.tvgId}
                    value={searchTvgIdInput}
                    onChange={setSearchTvgIdInput}
                    mode={inputModes.searchTvgId}
                    onToggle={toggleInputMode}
                    loading={loading}
                    onFocus={(e) => setFocusedInput(e.currentTarget.name)}
                    onBlur={() => setFocusedInput(null)}
                />
                <select
                    name="searchCategory"
                    onFocus={(e) => setFocusedInput(e.currentTarget.name)}
                    onBlur={() => setFocusedInput(null)}
                    value={searchCategory}
                    onChange={(e) => {
                        setSearchCategory(e.target.value as ContentCategoryFieldLabel);
                    }}
                    className="flex-[0.3] min-w-[100px] px-3 py-2 border rounded bg-gray-800 text-white border-gray-700"
                    title="Content Category"
                >
                    <option value="">All Categories</option>
                    {Object.values(ContentCategoryFieldLabel).map((cat) => (
                        <option key={cat} value={cat}>
                            {cat}
                        </option>
                    ))}
                </select>
                <select
                    name="searchFormaty"
                    onFocus={(e) => setFocusedInput(e.currentTarget.name)}
                    onBlur={() => setFocusedInput(null)}
                    value={searchFormat}
                    onChange={(e) => {
                        setSearchFormat(e.target.value as StreamFormat);
                    }}
                    className="flex-[0.2] min-w-[100px] px-3 py-2 border rounded bg-gray-800 text-white border-gray-700"
                    title="Stream Format"
                >
                    <option value="">All Formats</option>
                    {Object.values(StreamFormat).map((format) => (
                        <option key={format} value={format}>
                            {format.toUpperCase()}
                        </option>
                    ))}
                </select>
            </div>
            <div className="flex items-center gap-4 my-2">
                <div>
                    <label htmlFor="cardStyle" className="text-sm text-gray-300 mr-2">
                        Card Style:
                    </label>
                    <select
                        id="cardStyle"
                        value={useInteractiveCard ? "interactive" : "default"}
                        onChange={(e) => setUseInteractiveCard(e.target.value === "interactive")}
                        className="px-2 py-1 bg-gray-800 text-white border border-gray-700 rounded"
                    >
                        <option value="default">StreamCard</option>
                        <option value="interactive">StreamCardInteractive</option>
                    </select>
                </div>

                {!useInteractiveCard && (
                    <div>
                        <label htmlFor="playerMode" className="text-sm text-gray-300 mr-2">
                            Player Mode:
                        </label>
                        <select
                            id="playerMode"
                            value={playerMode}
                            onChange={(e) => setPlayerMode(e.target.value as "inline" | "popup")}
                            className="px-2 py-1 bg-gray-800 text-white border border-gray-700 rounded"
                        >
                            <option value="popup">Popup</option>
                            <option value="inline">Inline</option>
                        </select>
                    </div>
                )}
                {entries.length > 0 && entries.length <= appConfig.maxEntryExportCount && (
                    <button
                        onClick={handleExport}
                        className="bg-blue-600 text-white px-4 py-2 rounded mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Download filtered entries as .m3u playlist"
                    >
                        Export M3U
                    </button>
                )}
            </div>
            <div></div>
            {player.visible && player.mode === "inline" && (
                <div className="mt-6">
                    <InlinePlayer
                        url={player.url}
                        onClose={handleClosePlayer}
                        className="rounded shadow w-full max-w-3xl mx-auto"
                        showCloseButton={true}
                    />
                </div>
            )}
            {player.visible && player.mode === "popup" && (
                <InlinePlayer
                    url={player.url}
                    onClose={handleClosePlayer}
                    showCloseButton={true}
                    draggable
                    top={popupPosition.y}
                    left={popupPosition.x}
                    width={popupSize.width}
                    height={popupSize.height}
                    onMove={({ x, y }) => setPopupPosition({ x, y })}
                    onResize={({ width, height }) => setPopupSize({ width, height })}
                    className="w-[400px] aspect-video bg-black shadow-xl rounded"
                />
            )}

            <p className="text-sm text-gray-500 mb-2 text-center">
                Page <b>{currentPage}</b> of <b>{totalPages}</b> &nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;&nbsp;
                <i>
                    {totalEntries} result{totalEntries === 1 ? "" : "s"}
                </i>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                {entries.map((entry) =>
                    useInteractiveCard ? (
                        <StreamCardInteractive key={entry.url} entry={entry} />
                    ) : (
                        <StreamCard key={entry.url} entry={entry} showCopy={!appConfig.hideCredentialsInUrl} onPlay={(url) => handlePlay(url)} />
                    )
                )}
            </div>

            {entries && entries.length > 0 && (
                <div className="flex justify-center items-center mt-6 space-x-2">
                    <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="bg-gray-900 px-4 py-2 rounded disabled:opacity-50"
                    >
                        ⬅ Prev
                    </button>
                    <span className="font-semibold">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="bg-gray-900 px-4 py-2 rounded disabled:opacity-50"
                    >
                        Next ➡
                    </button>
                </div>
            )}
        </main>
    );
}
