"use client";

import { useEffect, useMemo, useState } from "react";
import { M3UEntry } from "@/types/M3UEntry";
import { M3UEntryFieldLabel } from "@/types/M3UEntryFieldLabel";
import { StreamingService } from "@/types/StreamingService";
import { services } from "@/config/services";
import { StreamCard } from "@/components/StreamCard/StreamCard";
import { StreamFormat } from "@/types/StreamFormat";
import { appConfig } from "@/config";
import { ContentCategoryFieldLabel, inferContentCategory } from "@/types/ContentCategoryFieldLabel";
import { useDebouncedState } from "./hooks/useDebouncedState";
import { ApiResponse } from "@/types/ApiResponse";
import { M3UResponse } from "@/types/M3UResponse";
import StreamCardInteractive from "@/components/StreamCardInteractive/StreamCardInteractive";

export default function HomePage() {
    const [entries, setEntries] = useState<M3UEntry[]>([]);
    const [searchNameInput, setSearchNameInput] = useState("");
    const [searchGroupInput, setSearchGroupInput] = useState("");
    const [searchTvgIdInput, setSearchTvgIdInput] = useState("");

    const searchName = useDebouncedState(searchNameInput, 200);
    const searchTvgId = useDebouncedState(searchTvgIdInput, 200);
    const searchGroup = useDebouncedState(searchGroupInput, 200);
    const [searchFormat, setSearchFormat] = useState<StreamFormat | "">("");
    const [searchCategory, setSearchCategory] = useState<ContentCategoryFieldLabel | "">("");
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [useInteractiveCard, setUseInteractiveCard] = useState(true);

    const pageSize = Number(appConfig.defaultPageSize);
    console.log("searchNameInput", searchNameInput);
    console.log("debounced searchName", searchName);
    console.log("Filtering", entries.length, "entries...");

    const [filtering, setIsFiltering] = useState(false);

    useEffect(() => {
        setIsFiltering(true);

        const timer = setTimeout(() => {
            setIsFiltering(false);
        }, 10); // Small timeout lets UI commit changes

        return () => clearTimeout(timer);
    }, [searchName, searchGroup, searchTvgId, searchFormat, searchCategory, entries]);

    const filteredEntries = useMemo(() => {
        return entries.filter((entry) => {
            const nameMatch = searchName ? entry.name.toLowerCase().includes(searchName.toLowerCase()) : true;
            const groupMatch = searchGroup ? entry.groupTitle.toLowerCase().includes(searchGroup.toLowerCase()) : true;
            const idMatch = searchTvgId ? entry.tvgId.toLowerCase().includes(searchTvgId.toLowerCase()) : true;
            const formatMatch = searchFormat ? entry.url.toLowerCase().endsWith(`.${searchFormat}`) : true;
            const categoryMatch = searchCategory ? inferContentCategory(entry.url) === searchCategory : true;

            return nameMatch && groupMatch && idMatch && formatMatch && categoryMatch;
        });
    }, [entries, searchName, searchGroup, searchTvgId, searchFormat, searchCategory]);

    const totalPages = Math.ceil(filteredEntries.length / pageSize);
    const paginatedEntries = filteredEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handleFetch = async (service: StreamingService) => {
        try {
            setLoading(true);
            const res = await fetch("/api/fetch-m3u", {
                method: "POST",
                body: JSON.stringify({
                    url: service.refreshUrl,
                    username: service.username,
                    serviceName: service.name,
                }),
            });

            const json: ApiResponse<M3UResponse> = await res.json();

            if (!json.success) {
                // 🛑 Handle error response
                console.error("Fetch failed:", json.error);
                alert(`Failed to load: ${json.error}`);
                return;
            }

            // ✅ Success
            console.log("[FETCH RESULT]", {
                serverCount: json.data.servers?.length,
                formatCount: json.data.formats?.length,
                categoryCount: json.data.categories?.length,
                entryCount: json.data.entries?.length,
                firstEntry: json.data.entries?.[0],
            });

            setEntries(json.data.entries);
            setCurrentPage(1);
        } catch (err) {
            console.error("Failed to fetch:", err);
        } finally {
            setLoading(false);
        }
    };

    function getInputClasses(loading: boolean) {
        return `flex-1 min-w-[150px] px-3 py-2 border rounded ${
            loading ? "bg-gray-800 text-gray-400 border-gray-600 cursor-not-allowed pointer-events-none" : ""
        }`;
    }

    return (
        <main className="p-4">
            <h1 className="text-xl font-bold mb-4">{appConfig.appName}</h1>
            <div className="flex items-center gap-3 mb-4">
                {services.map((service) => (
                    <button
                        key={service.id}
                        onClick={() => handleFetch(service)}
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Load {service.name}
                    </button>
                ))}

                {(loading || filtering) && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            </div>

            <div className="flex flex-wrap gap-2 items-center my-4">
                <input
                    type="text"
                    placeholder={`Search ${M3UEntryFieldLabel.name}`}
                    title={M3UEntryFieldLabel.name}
                    value={searchNameInput}
                    disabled={loading}
                    onChange={(e) => {
                        setSearchNameInput(e.target.value);
                        setCurrentPage(1);
                    }}
                    className={getInputClasses(loading)}
                />
                <input
                    type="text"
                    placeholder={`Search ${M3UEntryFieldLabel.groupTitle}`}
                    title={M3UEntryFieldLabel.groupTitle}
                    value={searchGroupInput}
                    onChange={(e) => {
                        setSearchGroupInput(e.target.value);
                        setCurrentPage(1);
                    }}
                    className={getInputClasses(loading)}
                />
                <input
                    type="text"
                    placeholder={`Search ${M3UEntryFieldLabel.tvgId}`}
                    title={M3UEntryFieldLabel.tvgId}
                    value={searchTvgIdInput}
                    onChange={(e) => {
                        setSearchTvgIdInput(e.target.value);
                        setCurrentPage(1);
                    }}
                    className={getInputClasses(loading)}
                />
                <select
                    value={searchCategory}
                    onChange={(e) => {
                        setSearchCategory(e.target.value as ContentCategoryFieldLabel);
                        setCurrentPage(1);
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
                    value={searchFormat}
                    onChange={(e) => {
                        setSearchFormat(e.target.value as StreamFormat);
                        setCurrentPage(1);
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

            <div className="flex items-center gap-2 my-2">
                <label htmlFor="cardToggle" className="text-sm text-gray-300">
                    Card Style:
                </label>
                <select
                    id="cardToggle"
                    value={useInteractiveCard ? "interactive" : "default"}
                    onChange={(e) => setUseInteractiveCard(e.target.value === "interactive")}
                    className="px-2 py-1 bg-gray-800 text-white border border-gray-700 rounded"
                >
                    <option value="default">Default</option>
                    <option value="interactive">Inline Player</option>
                </select>
            </div>

            <p className="text-sm text-gray-500 mb-2 text-center">
                Page <b>{currentPage}</b> of <b>{totalPages}</b> &nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;&nbsp;
                <i>
                    {filteredEntries && filteredEntries.length} result{filteredEntries.length === 1 ? "" : "s"}
                </i>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                {paginatedEntries.map((entry) =>
                    useInteractiveCard ? (
                        <StreamCardInteractive key={entry.url} entry={entry} />
                    ) : (
                        <StreamCard key={entry.url} entry={entry} showCopy={!appConfig.hideCredentialsInUrl} />
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
