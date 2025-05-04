"use client";

import { useEffect, useState, useMemo } from "react";
import { M3UEntry } from "@/types/M3UEntry";
import { M3UEntryFieldLabel } from "@/types/M3UEntryFieldLabel";
import { StreamingService } from "@/types/StreamingService";
import { services } from "@/config";
import { StreamCard } from "@/components/cards/StreamCard/StreamCard";
import { StreamFormat } from "@/types/StreamFormat";
import { appConfig } from "@/config";
import { ContentCategoryFieldLabel } from "@/types/ContentCategoryFieldLabel";
import { useDebouncedState } from "src/hooks/useDebouncedState";
import { useInputFocusTracker } from "src/hooks/useInputFocusTracker";
import { ApiResponse } from "@/types/ApiResponse";
import { M3UResponse } from "@/types/M3UResponse";
import StreamCardInteractive from "@/components/cards/StreamCardInteractive/StreamCardInteractive";
import { InlinePlayer } from "@/components/InlinePlayer/InlinePlayer";
import { FetchM3URequest } from "@/types/FetchM3URequest";
import { FilterInput } from "@/components/FilterInput/FilterInput";
import { PaginationControls } from "@/components/PaginationControls/PaginationControls";
import { YearFilterSelect } from "@/components/YearFilterSelect/YearFilterSelect";
import { Spinner } from "@/components/Spinner/Spinner";
import { useSession } from "next-auth/react";

import { LiveMonitorPanel } from "@/components/Live/LiveMonitorPanel";
import { UserRole } from "@/utils/auth/accessControl";
import { showMessageBox } from "@/components/ui/MessageBox";
import { InlineHlsPlayer } from "@/components/InlineHlsPlayer";
import { UserMenu } from "@/components/UserMenu/UserMenu";

export default function ClientApp({ userRole }: { userRole: UserRole }) {
    const { data: session, status } = useSession();
    const [entries, setEntries] = useState<M3UEntry[]>([]);
    const [liveCount, setLiveCount] = useState(0);
    const [searchNameInput, setSearchNameInput] = useState("");
    const [searchGroupInput, setSearchGroupInput] = useState("");
    const [searchTvgIdInput, setSearchTvgIdInput] = useState("");

    const [selectedYears, setSelectedYears] = useState<string[]>([]);
    const [player, setPlayer] = useState<{
        url: string;
        title?: string;
        mode: "popup" | "inline";
        visible: boolean;
        waitForPlaylist?: boolean;
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
    const { focusedInput, setFocusedInput, trackInput, restoreFocus } = useInputFocusTracker();
    const [activeService, setActiveService] = useState<StreamingService | null>(null);
    const [totalEntries, setTotalEntries] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [yearsFromServer, setYearsFromServer] = useState<string[]>([]);
    const [inputModes, setInputModes] = useState<Record<string, { isRegex: boolean; isCaseSensitive: boolean }>>({
        searchName: { isRegex: false, isCaseSensitive: false },
        searchGroup: { isRegex: false, isCaseSensitive: false },
        searchTvgId: { isRegex: false, isCaseSensitive: false },
    });

    useEffect(() => {
        if (!loading && focusedInput) {
            restoreFocus(focusedInput);
        }
    }, [loading, focusedInput]);

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

    const hasActiveFilters = useMemo(() => {
        return (
            !!debouncedFilters.name.value ||
            !!debouncedFilters.groupTitle.value ||
            !!debouncedFilters.tvgId.value ||
            !!debouncedFilters.format ||
            !!debouncedFilters.category ||
            (debouncedFilters.years && debouncedFilters.years.length > 0)
        );
    }, [debouncedFilters]);

    const pageSize = Number(appConfig.defaultPageSize);

    function handlePlay(url: string) {
        const isOwnLiveStream = url.startsWith("/api/hls-stream/") && url.endsWith("/playlist");
        const absoluteUrl = new URL(url, window.location.origin).toString();
        const matchingEntry = entries.find((entry) => entry.url === url);
        setPlayer({
            url: isOwnLiveStream ? absoluteUrl : url,
            title: matchingEntry?.name ?? "",
            mode: playerMode,
            visible: true,
            waitForPlaylist: isOwnLiveStream, // We'll pass this down to InlinePlayer
        });
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

    function isValidRegex(pattern: string): boolean {
        try {
            new RegExp(pattern);
            return true;
        } catch {
            return false;
        }
    }

    const buttonBaseClasses = "bg-gray-700 text-white px-4 py-2 rounded transition-colors duration-150 hover:bg-gray-600 disabled:opacity-50";

    async function handleFetch(service: StreamingService | null = activeService, source: string = "unknown", force: boolean = false) {
        if (!service) return;
        // Validate each regex-enabled input
        if (
            (inputModes.searchName.isRegex && !isValidRegex(searchName)) ||
            (inputModes.searchGroup.isRegex && !isValidRegex(searchGroup)) ||
            (inputModes.searchTvgId.isRegex && !isValidRegex(searchTvgId))
        ) {
            return showMessageBox({
                variant: "warning",
                blocking: false,
                title: "Invalid Regex",
                message: "Please fix your regex pattern(s) before searching.",
                toast: true,
                position: "bottom-right",
                displayTime: 3000,
            });
        }

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
            const res = await fetch(`/api/fetch-m3u${force ? "?force=true" : ""}`, {
                method: "POST",
                body: JSON.stringify(requestBody),
            });

            const json: ApiResponse<M3UResponse> = await res.json();

            if (!json.success) {
                return showMessageBox({
                    variant: "warning",
                    title: "No items found",
                    message: json.error,
                    toast: true,
                    blocking: false,
                    position: "bottom-right",
                    displayTime: 5000,
                });
            } else if (force) {
                if (force) {
                    showMessageBox({
                        variant: "success",
                        title: `${service?.name ?? "Unknown"}`,
                        message: `Playlist refreshed successfully!`,
                        toast: true,
                        blocking: false,
                        position: "bottom-right",
                        displayTime: 5000,
                    });
                }
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
        if (!activeService) return;

        const fetchCount = () => {
            fetch(`/api/live/active/count?serviceId=${activeService.id}`)
                .then((r) => r.json())
                .then((json: { count: number }) => {
                    setLiveCount(json.count ?? 0);
                })
                .catch(() => {
                    console.warn("Failed to poll liveCount");
                    setLiveCount(0);
                });
        };

        fetchCount();
        const intervalId = setInterval(fetchCount, 5000);
        return () => clearInterval(intervalId);
    }, [activeService]);

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
        if (!activeService) return;
        handleFetch(activeService, "useEffect:... [currentPage, activeService, debouncedFilters, handleFetch])");
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
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M19 19H5m7-14l7 7-8 8-7-7 8-8z" />
        </svg>
    );

    return (
        <main className="p-4 max-w-full mx-auto">
            <div className="flex items-center justify-between mb-4">
                {/* ←‑ existing heading */}
                <h1 className="text-xl font-bold truncate max-w-[60%]">{appConfig.appName}</h1>

                {/* existing user name */}
                <div className="flex items-center gap-4 relative">
                    <div className="flex items-center justify-between mb-4">
                        <UserMenu
                            userName={session?.user?.name ?? "unknown"}
                            userRole={userRole}
                            showForceRefresh={activeService?.id !== undefined && !activeService?.hasFileAccess}
                            onForceRefresh={() => handleFetch(undefined, "Admin Force Refresh", true)}
                            onExport={handleExport}
                            canExport={entries.length > 0 && entries.length <= appConfig.maxEntryExportCount}
                        />
                    </div>
                </div>
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
                                    // console.log("🌀 Switching to service:", selected);
                                    // handleFetch(selected, "onChange: serviceSelect");
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
            {/* Filters */}
            <div className="w-full mb-6">
                <fieldset
                    className={`relative rounded p-4 transition-colors duration-200 border ${
                        hasActiveFilters ? "border-gray-400 border-[1.5px]" : "border-gray-700 border"
                    }`}
                >
                    <legend
                        className={`text-sm px-2 transition-colors duration-200 ${
                            hasActiveFilters ? "text-gray-300 font-bold" : "text-gray-400 font-normal"
                        }`}
                    >
                        Filters
                    </legend>
                    <button
                        className={`absolute right-1 -top-7 z-10 w-9 h-9 flex items-center justify-center rounded-full shadow transition
                            ${hasActiveFilters ? "bg-yellow-600 hover:bg-yellow-500 text-white" : "bg-gray-700 text-gray-400"}`}
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
                            mode={inputModes.searchName}
                            onToggle={toggleInputMode}
                            loading={loading}
                            onChange={(val) => {
                                setSearchNameInput(val);
                                const el = document.querySelector<HTMLInputElement>('input[name="searchName"]');
                                if (el) trackInput("searchName", el.selectionStart, el.selectionEnd);
                            }}
                            onFocus={(e) => {
                                const { name, selectionStart, selectionEnd } = e.currentTarget;
                                setFocusedInput(name);
                                trackInput(name, selectionStart, selectionEnd);
                            }}
                        />
                        <FilterInput
                            name="searchGroup"
                            label={M3UEntryFieldLabel.groupTitle}
                            value={searchGroupInput}
                            onChange={(val) => {
                                setSearchGroupInput(val);
                                const el = document.querySelector<HTMLInputElement>('input[name="searchGroup"]');
                                if (el) trackInput("searchGroup", el.selectionStart, el.selectionEnd);
                            }}
                            onFocus={(e) => {
                                const { name, selectionStart, selectionEnd } = e.currentTarget;
                                setFocusedInput(name);
                                trackInput(name, selectionStart, selectionEnd);
                            }}
                            mode={inputModes.searchGroup}
                            onToggle={toggleInputMode}
                            loading={loading}
                        />

                        <FilterInput
                            name="searchTvgId"
                            label={M3UEntryFieldLabel.tvgId}
                            value={searchTvgIdInput}
                            onChange={(val) => {
                                setSearchTvgIdInput(val);
                                const el = document.querySelector<HTMLInputElement>('input[name="searchTvgId"]');
                                if (el) trackInput("searchTvgId", el.selectionStart, el.selectionEnd);
                            }}
                            onFocus={(e) => {
                                const { name, selectionStart, selectionEnd } = e.currentTarget;
                                setFocusedInput(name);
                                trackInput(name, selectionStart, selectionEnd);
                            }}
                            mode={inputModes.searchTvgId}
                            onToggle={toggleInputMode}
                            loading={loading}
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
            <div className="flex flex-wrap items-end gap-4 mb-6">
                <LiveMonitorPanel
                    userRole={userRole}
                    // onInlinePlay={handlePlay}
                />
            </div>
            {player.visible && player.mode === "inline" && (
                <InlineHlsPlayer
                    key={player.url}
                    url={player.url}
                    title={player.title ?? ""}
                    onClose={handleClosePlayer}
                    className="rounded shadow w-full max-w-3xl mx-auto"
                />
                // <InlinePlayer
                // key={player.url}
                //     url={player.url}
                //     serviceId={activeService?.id ?? ""}
                //     waitForPlaylist={player.waitForPlaylist}
                //     onClose={handleClosePlayer}
                //     className="rounded shadow w-full max-w-3xl mx-auto"
                //     showCloseButton={true}
                // />
            )}
            {player.visible && player.mode === "popup" && (
                <InlinePlayer
                    url={player.url}
                    autoPlay={true}
                    movieTitle={player.title ?? ""}
                    serviceId={activeService?.id ?? ""}
                    waitForPlaylist={player.waitForPlaylist}
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
            {totalEntries > appConfig.defaultPageSize && (
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalEntries={totalEntries}
                    onPageChange={(page) => setCurrentPage(Math.max(1, Math.min(totalPages, page)))}
                    buttonClassName={buttonBaseClasses}
                    className="mt-6"
                />
            )}
            <div className="grid grid-cols-1 md:[grid-template-columns:repeat(auto-fit,minmax(280px,1fr))] gap-x-6 gap-y-8">
                {activeService &&
                    entries.map((entry) => {
                        const ext = entry.url.split(".").pop()?.toLowerCase() ?? "";
                        const isMovie = ["mp4", "mkv"].includes(ext);
                        const viewslots = (activeService?.maxConcurrentViewers ?? 0) - liveCount;
                        const canPlay = viewslots > 0;
                        const showRecord = canPlay && !isMovie;
                        const showStreaming = canPlay && !isMovie;
                        const showPlayButton = canPlay && isMovie;
                        return useInteractiveCard ? (
                            <StreamCardInteractive key={entry.url} serviceId={activeService.id} entry={entry} />
                        ) : (
                            // The card figures out if user is allowed to see the buttons based on userRole, app only thinks about the count of cuncurrent viewers
                            <StreamCard
                                key={entry.url}
                                userName={session?.user?.name ?? "unknown"}
                                serviceId={activeService?.id ?? ""}
                                entry={entry}
                                userRole={userRole}
                                showCopy={!appConfig.hideCredentialsInUrl}
                                showRecordButton={showRecord}
                                showPlayButton={showPlayButton}
                                showStreamButton={showStreaming}
                                showDeleteButton={activeService?.hasFileAccess}
                                showDownloadButton={canPlay && !activeService?.hasFileAccess}
                                onPlay={(url) => handlePlay(url)}
                                onDelete={(deletedEntry) => setEntries((prev) => prev.filter((e) => e.url !== deletedEntry.url))}
                            />
                        );
                    })}
            </div>
            {totalEntries > appConfig.defaultPageSize && (
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalEntries={totalEntries}
                    onPageChange={(page) => setCurrentPage(Math.max(1, Math.min(totalPages, page)))}
                    buttonClassName={buttonBaseClasses}
                    className="mt-6"
                />
            )}
        </main>
    );
}
