"use client";

import { useEffect, useState, useMemo } from "react";
import { M3UEntry } from "@/types/M3UEntry";
import { M3UEntryFieldLabel } from "@/types/M3UEntryFieldLabel";
import { StreamingService } from "@/types/StreamingService";
import { getUserRole, services } from "@/config";
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
import { PaginationControls } from "@/components/PaginationControls/PaginationControls";
import { YearFilterSelect } from "@/components/YearFilterSelect/YearFilterSelect";
import { Spinner } from "@/components/Spinner/Spinner";
import { useSession } from "next-auth/react";

export default function ClientApp({ role }: { role: string }) {
    const { data: session, status } = useSession();

    const [entries, setEntries] = useState<M3UEntry[]>([]);
    const [searchNameInput, setSearchNameInput] = useState("");
    const [searchGroupInput, setSearchGroupInput] = useState("");
    const [searchTvgIdInput, setSearchTvgIdInput] = useState("");
    const [selectedYears, setSelectedYears] = useState<string[]>([]);
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
    const stableSelectedYears = useMemo(() => [...selectedYears].sort(), [selectedYears]);
    const debouncedYears = useDebouncedState(stableSelectedYears, 1000);
    const [searchFormat, setSearchFormat] = useState<StreamFormat | "">("");
    const [formatsFromServer, setFormatsFromServer] = useState<StreamFormat[]>([]);
    const [searchCategory, setSearchCategory] = useState<ContentCategoryFieldLabel | "">("");
    const [categoriesFromServer, setCategoriesFromServer] = useState<ContentCategoryFieldLabel[]>([]);
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
    const [yearsFromServer, setYearsFromServer] = useState<string[]>([]);
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
            years: debouncedYears,
        }),
        [searchName, searchGroup, searchTvgId, searchFormat, searchCategory, inputModes, debouncedYears]
    );

    const pageSize = Number(appConfig.defaultPageSize);

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

    function handlePageChange(offset: number) {
        if (offset > 0) {
            setCurrentPage((p) => Math.min(totalPages, p + 1));
        } else {
            setCurrentPage((p) => Math.max(1, p - 1));
        }
    }

    const buttonBaseClasses = "bg-gray-700 text-white px-4 py-2 rounded transition-colors duration-150 hover:bg-gray-600 disabled:opacity-50";

    async function handleFetch(service: StreamingService | null = activeService, source: string = "unknown") {
        if (!service) return;
        console.log(`handleFetch called by : ${source}`);
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
            setYearsFromServer(json.data.years || []);
            setCategoriesFromServer(json.data.categories || []);
            setFormatsFromServer((json.data.formats ?? []) as StreamFormat[]);

        } catch (err) {
            console.error("Fetch failed", err);
        } finally {
            setLoading(false);
        }
    }
    const mergedYears = useMemo(() => {
        return Array.from(new Set([...yearsFromServer, ...selectedYears])).sort((a, b) => parseInt(b) - parseInt(a));
    }, [yearsFromServer, selectedYears]);

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
            handleFetch(activeService, "useEffect:... [currentPage, activeService, debouncedFilters, handleFetch])");
        }
    }, [currentPage, activeService, debouncedFilters]);

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

    function handleClearFilters() {
        setSearchNameInput("");
        setSearchGroupInput("");
        setSearchTvgIdInput("");
        setSearchFormat("");
        setSearchCategory("");
        setSelectedYears([]);
    }

    if (status === "loading") {
        return <p className="text-white p-4">Loading session...</p>;
    }

    const EraserIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M19 19H5m7-14l7 7-8 8-7-7 8-8z" />
        </svg>
    );

    return (
        <main className="p-4 max-w-full mx-auto">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold truncate max-w-[60%]">{appConfig.appName}</h1>
                <h3 className="text-lg font-semibold text-right whitespace-nowrap overflow-hidden text-ellipsis hidden sm:block">
                    {session?.user?.name} {role}
                </h3>
            </div>

            <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
                {loading && <Spinner />}

                {/* Left Group: Service select + Export */}
                <div className="flex flex-wrap items-end gap-4">
                    {/* Select Service */}
                    <label htmlFor="serviceSelect" className="text-sm text-white flex flex-col">
                        Select Service:
                        <select
                            id="serviceSelect"
                            value={activeService?.id ?? ""}
                            onChange={(e) => {
                                const selected = services.find((s) => s.id === e.target.value);
                                if (selected) {
                                    setActiveService(selected);
                                    setCurrentPage(1);
                                    handleFetch(selected, "onChange: serviceSelect");
                                }
                            }}
                            disabled={loading}
                            className="bg-gray-800 text-white px-3 py-2 border border-gray-600 rounded mt-1 min-w-[200px]"
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
                    </label>

                    {/* Export Button */}
                    {entries.length > 0 && entries.length <= appConfig.maxEntryExportCount && (
                        <button
                            onClick={handleExport}
                            className={`${buttonBaseClasses} flex items-center gap-2`}
                            title="Download filtered entries as .m3u playlist"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
                                />
                            </svg>
                            <span>Export</span>
                        </button>
                    )}
                </div>
                {/* Right Group: Card Style + Player Mode */}
                <div className="flex flex-wrap items-end gap-4">
                    {/* Card Style */}
                    <label className="text-sm text-white flex flex-col">
                        Card Style:
                        <select
                            id="cardStyle"
                            value={useInteractiveCard ? "interactive" : "default"}
                            onChange={(e) => setUseInteractiveCard(e.target.value === "interactive")}
                            className="bg-gray-800 text-white px-3 py-2 border border-gray-600 rounded mt-1 min-w-[150px]"
                        >
                            <option value="default">StreamCard</option>
                            <option value="interactive">StreamCardInteractive</option>
                        </select>
                    </label>

                    {/* Player Mode (only if not interactive) */}
                    {!useInteractiveCard && (
                        <label className="text-sm text-white flex flex-col">
                            Player Mode:
                            <select
                                id="playerMode"
                                value={playerMode}
                                onChange={(e) => setPlayerMode(e.target.value as "inline" | "popup")}
                                className="bg-gray-800 text-white px-3 py-2 border border-gray-600 rounded mt-1 min-w-[120px]"
                            >
                                <option value="popup">Popup</option>
                                <option value="inline">Inline</option>
                            </select>
                        </label>
                    )}
                </div>
            </div>

            <div className="w-full mb-6">
                <fieldset className="relative border border-gray-700 rounded p-4">
                    <legend className="text-sm text-gray-400 px-2">Filters</legend>
                    <button
                        className="absolute right-1 -top-7 z-10 bg-gray-800 hover:bg-red-600 text-white p-2 rounded-full shadow transition"
                        onClick={handleClearFilters}
                        title="Clear all filters"
                    >
                        <EraserIcon />
                    </button>
                    <legend className="text-sm text-gray-400 px-2">Filters</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
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
                            {categoriesFromServer.map((cat) => (
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
                            onChange={(e) => setSearchFormat(e.target.value as StreamFormat)}
                            className="flex-[0.2] min-w-[100px] px-3 py-2 border rounded bg-gray-800 text-white border-gray-700"
                            title="Stream Format"
                        >
                            <option value="">All Formats</option>
                            {formatsFromServer.map((format) => (
    <option key={format} value={format}>
      {format.toUpperCase()}
                                </option>
                            ))}
                        </select>
                        <YearFilterSelect
                            years={mergedYears}
                            selected={selectedYears}
                            onToggle={(year) => {
                                setSelectedYears((prev) => {
                                    const safe = Array.isArray(prev) ? prev : [];
                                    return safe.includes(year) ? safe.filter((y) => y !== year) : [...safe, year];
                                });
                            }}
                        />
                    </div>
                </fieldset>
            </div>

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

            <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalEntries={totalEntries}
                onPageChange={handlePageChange}
                buttonClassName={buttonBaseClasses}
                className={`mt-6`}
            />

            <div className="grid grid-cols-1 md:[grid-template-columns:repeat(auto-fit,minmax(280px,1fr))] gap-x-6 gap-y-8">
                {entries.map((entry) =>
                    useInteractiveCard ? (
                        <StreamCardInteractive key={entry.url} entry={entry} />
                    ) : (
                        <StreamCard key={entry.url} 
                                    entry={entry} 
                                    showCopy={!appConfig.hideCredentialsInUrl} 
                                    showRecord={getUserRole(session?.user?.email) === "admin"}
                                    onPlay={(url) => handlePlay(url)} />
                    )
                )}
            </div>

            {entries && entries.length > 6 && (
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalEntries={totalEntries}
                    onPageChange={(delta) => setCurrentPage((prev) => Math.max(1, Math.min(totalPages, prev + delta)))}
                    buttonClassName={buttonBaseClasses}
                    className="mt-6"
                />
            )}
        </main>
    );
}
