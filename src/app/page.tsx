"use client";

import { useState } from "react";
import { M3UEntry } from "@/types/M3UEntry";
import { M3UEntryFieldLabel } from "@/types/M3UEntryFieldLabel";
import { StreamingService } from "@/types/StreamingService";
import { fetchAndParseM3U } from "@/services/fetchAndParseM3U";
import { services } from "@/config/services";
import { ChannelCard } from "@/components/ChannelCard/ChannelCard";
import { StreamFormat } from "@/types/StreamFormat";
import { appConfig } from "@/config";

export default function HomePage() {
    const [entries, setEntries] = useState<M3UEntry[]>([]);
    const [searchName, setSearchName] = useState("");
    const [searchGroup, setSearchGroup] = useState("");
    const [searchTvgId, setSearchTvgId] = useState("");
    const [searchFormat, setSearchFormat] = useState<StreamFormat | "">("");
    const filteredEntries = entries.filter((entry) => {
        const nameMatch = searchName ? entry.name.toLowerCase().includes(searchName.toLowerCase()) : true;

        const groupMatch = searchGroup ? entry.groupTitle.toLowerCase().includes(searchGroup.toLowerCase()) : true;

        const idMatch = searchTvgId ? entry.tvgId.toLowerCase().includes(searchTvgId.toLowerCase()) : true;

        const formatMatch = searchFormat ? entry.url.toLowerCase().endsWith(`.${searchFormat}`) : true;

        return nameMatch && groupMatch && idMatch && formatMatch;
    });

    const [currentPage, setCurrentPage] = useState(1);

    const pageSize = Number(appConfig.defaultPageSize);

    const totalPages = Math.ceil(filteredEntries.length / pageSize);
    const paginatedEntries = filteredEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handleFetch = async (service: StreamingService) => {
        try {
            const parsed = await fetchAndParseM3U(service);
            if (!parsed) {
                console.error("Failed to fetch or parse M3U entries");
                return;
            }
            // Let's console log the first 5 entries for debugging
            console.log("Fetched Entries:", parsed.slice(0, 5));
            setEntries(parsed);
            setCurrentPage(1); // reset to first page on new fetch
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <main className="p-4">
            <h1 className="text-xl font-bold mb-4">{appConfig.appName}</h1>

            {services.map((service) => (
                <button key={service.id} onClick={() => handleFetch(service)} className="bg-blue-600 text-white px-4 py-2 rounded mr-2">
                    Load {service.name}
                </button>
            ))}

            <div className="flex flex-wrap gap-2 items-center my-4">
                <input
                    type="text"
                    placeholder={`Search ${M3UEntryFieldLabel.name}`}
                    title={M3UEntryFieldLabel.name}
                    value={searchName}
                    onChange={(e) => {
                        setSearchName(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="flex-1 min-w-[150px] px-3 py-2 border rounded"
                />
                <input
                    type="text"
                    placeholder={`Search ${M3UEntryFieldLabel.groupTitle}`}
                    title={M3UEntryFieldLabel.groupTitle}
                    value={searchGroup}
                    onChange={(e) => {
                        setSearchGroup(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="flex-1 min-w-[150px] px-3 py-2 border rounded"
                />
                <input
                    type="text"
                    placeholder={`Search ${M3UEntryFieldLabel.tvgId}`}
                    title={M3UEntryFieldLabel.tvgId}
                    value={searchTvgId}
                    onChange={(e) => {
                        setSearchTvgId(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="flex-1 min-w-[150px] px-3 py-2 border rounded"
                />
                <select
                    value={searchFormat}
                    onChange={(e) => {
                        setSearchFormat(e.target.value as StreamFormat);
                        setCurrentPage(1);
                    }}
                    className="flex-[0.25] min-w-[100px] px-3 py-2 border rounded bg-gray-800 text-white border-gray-700"

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

            <p className="text-sm text-gray-500 mb-2 text-center">
                Page <b>{currentPage}</b> of <b>{totalPages}</b> &nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;&nbsp;<i>{filteredEntries.length} result{filteredEntries.length === 1 ? "" : "s"}</i> 
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                {paginatedEntries.map((entry) => (
                    <ChannelCard key={entry.url} entry={entry} />
                ))}
            </div>

            {entries.length > 0 && (
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
