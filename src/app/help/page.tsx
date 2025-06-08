// src/app/help/page.tsx
import React from "react";
import { helpSectionClasses, headingClasses } from "@/utils/ui/classNames";
import { RegexBlock } from "@/components/ui/RegexBlock";

export default function HelpPage() {
    return (
        <div className={helpSectionClasses}>
            <section>
                <h1 className="text-3xl font-bold mb-2">📚 Guttihub Help & Tips</h1>
                <p>
                    Guttihub Stream lets you filter, schedule, and monitor IPTV streams with precision. Here is how to use regex filtering like a pro.
                </p>
            </section>

            <section>
                <h3 className={headingClasses}>🎯 Basic Regex Filtering</h3>
                <p>Use these filters in any input field where regex mode is enabled.</p>

                <h3 className="mt-4 font-semibold">Exclude Common Languages</h3>
                <RegexBlock title="Field: Group Title">
                    ^(?!.*\bPolskie\b)(?!.*\bTurkish\b)(?!.*\bDanish\b)(?!.*\bArabic\b)(?!.*\bFrançais\b)(?!.*\bPortugal\b)(?!.*\Português\b)(?!.*\bGerman\b)(?!.*\bSwedish\b)(?!.*\bSpanish\b)(?!.*\Português\b)(?=\S).*$
                </RegexBlock>

                <h3 className="mt-6 font-semibold">Whitelist Only Favorites</h3>
                <p>Exclude nearly everything, then delete what you want to show:</p>
                <RegexBlock title="Field: Group Title">
                    {`^(?!.*\\bPolskie\\b)(?!.*\\bBollywood\\b)(?!.*\\bTurkish\\b)(?!.*\\bDanish\\b)(?!.*\\bTR\\b)(?!.*\\bEx-Yu\\b)(?!.*\\bNL\\b)(?!.*\\bArabic\\b)(?!.*\\bFrançais\\b)(?!.*\\bPortugal\\b)(?!.*\\bGerman\\b)(?!.*\\bSwedish\\b)(?=\\S).*`}
                </RegexBlock>

                <h3 className="mt-6 font-semibold">Match Specific Providers</h3>
                <RegexBlock title="Field: Group Title">\bNetflix\b</RegexBlock>

                <h3 className="mt-6 font-semibold">Filter by Year or Tag</h3>
                <RegexBlock title="Field: Entry Title">(?=.*\b2023\b)(?=.*\bmovie\b).*</RegexBlock>
            </section>

            <section>
                <h3 className={headingClasses}>📺 Genre & Content Filters</h3>

                <h3 className="mt-4 font-semibold">Match Common Genres</h3>
                <RegexBlock title="Field: Title / Category">\b(Action|Comedy|Drama|Thriller)\b</RegexBlock>

                <h3 className="mt-6 font-semibold">Only Include {`"Live"`} Channels</h3>
                {/* 👇 Uses case-insensitive manual match since "Live" is often inconsistently cased */}
                <RegexBlock title="Field: Title">\b[Ll][Ii][Vv][Ee]\b</RegexBlock>
            </section>

            <section>
                <h3 className={headingClasses}>🔧 Advanced Filters</h3>
                <p>These filters are great for edge cases or refining massive playlists.</p>

                <h3 className="mt-4 font-semibold">Exclude VOD / Non-Stream URLs</h3>
                <RegexBlock title="Field: URL">^(?!.*\.m3u8$).*</RegexBlock>

                <h3 className="mt-6 font-semibold">Match Video Resolution</h3>
                <RegexBlock title="Field: Entry Title">\b(720p|1080p)\b</RegexBlock>

                <h3 className="mt-6 font-semibold">Exclude Numbers in Titles</h3>
                <RegexBlock title="Field: Title">^(?!.*\d).*</RegexBlock>

                <h3 className="mt-6 font-semibold">Match Time Patterns (HH:MM)</h3>
                <RegexBlock title="Field: Title">{String.raw`\b\d{1,2}:\d{2}\b`}</RegexBlock>

                <h3 className="mt-6 font-semibold">Only Show MPEG-TS (.ts) URLs</h3>
                <RegexBlock title="Field: URL">\.ts\b</RegexBlock>

                <h3 className="mt-6 font-semibold">Remove Test/Demo Channels</h3>
                <RegexBlock title="Field: Title / Group Title">^(?!.*\b(test|demo)\b).*</RegexBlock>
            </section>

            <section>
                <h2 className={headingClasses}>📅 Scheduling & Recording</h2>
                <p>
                    Coming soon: schedule recordings using the <code>at</code> command with live monitoring and smart cleanup.
                </p>
            </section>

            <section>
                <h2 className={headingClasses}>📥 Downloads & Output</h2>
                <p>How downloaded files are tracked, exposed, and cleaned up automatically — coming soon.</p>
            </section>

            <section>
                <h2 className={headingClasses}>🔐 Auth & Roles</h2>
                <p>Understand role-based access with Google OAuth2: Admin, Moderator, Streamer, and Viewer. Detailed breakdown coming soon.</p>
            </section>
        </div>
    );
}
