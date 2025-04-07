"use client";

import { useState } from "react";
import { M3UEntry } from "@/types/M3UEntry";
import { StreamingService } from "@/types/StreamingService";
import { fetchAndParseM3U } from "@/services/fetchAndParseM3U";
import { services } from "@/config/services";
import ChannelCard from "@/components/ChannelCard/ChannelCard";

export default function HomePage() {
    const [entries, setEntries] = useState<M3UEntry[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const filteredEntries = entries.filter((entry) => entry.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const [currentPage, setCurrentPage] = useState(1);

    const pageSize = 50;

    const totalPages = Math.ceil(filteredEntries.length / pageSize);
    const paginatedEntries = filteredEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handleFetch = async (service: StreamingService) => {
        try {
            const parsed = await fetchAndParseM3U(service);
            setEntries(parsed);
            setCurrentPage(1); // reset to first page on new fetch
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <main className="p-4">
            <h1 className="text-xl font-bold mb-4">Streaming Client</h1>

            {services.map((service) => (
                <button key={service.id} onClick={() => handleFetch(service)} className="bg-blue-600 text-white px-4 py-2 rounded mr-2">
                    Load {service.name}
                </button>
            ))}

            <div className="mt-4 mb-4">
                <input
                    type="text"
                    placeholder="Search channels..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1); // reset to page 1 when searching
                    }}
                    className="w-full max-w-md px-4 py-2 border rounded"
                />
            </div>

            <p className="text-sm text-gray-500 mb-2">
                Showing {filteredEntries.length} result{filteredEntries.length === 1 ? "" : "s"}
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
                        className="bg-gray-200 px-4 py-2 rounded disabled:opacity-50"
                    >
                        ⬅ Prev
                    </button>

                    <span className="font-semibold">
                        Page {currentPage} of {totalPages}
                    </span>

                    <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="bg-gray-200 px-4 py-2 rounded disabled:opacity-50"
                    >
                        Next ➡
                    </button>
                </div>
            )}
        </main>
    );
}
