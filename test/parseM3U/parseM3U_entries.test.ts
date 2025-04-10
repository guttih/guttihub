import { parseM3U } from "@/utils/parseM3U";
import { describe, it, expect } from "vitest";

const mockM3U = `
#EXTM3U
#EXTINF:-1 tvg-id="" tvg-name="#### GENERAL HD/4K ####" tvg-logo="" group-title="UK| GENERAL ᴴᴰ/ᴿᴬᵂ",#### GENERAL HD/4K ####
http://m3u.best-smarter.me:80/USERNAME/PASSWORD/1015349
#EXTINF:-1 tvg-id="BBCOneOxford.uk" tvg-name="UK: BBC ONE LONDON 4K ◉" tvg-logo="http://icon-tmdb.me/stalker_portal/misc/logos/320/11987.jpg?90172" group-title="UK| GENERAL ᴴᴰ/ᴿᴬᵂ",UK: BBC ONE LONDON 4K ◉
http://m3u.best-smarter.me:80/USERNAME/PASSWORD/497001
#EXTINF:-1 tvg-id="" tvg-name="TOP - Den of Thieves 2: Pantera (2025)" tvg-logo="https://image.tmdb.org/t/p/w600_and_h900_bestv2/p6Zz0gETvkC33Pst1h6sh9Js6x.jpg" group-title="TOP MOVIES BLURAY (MULTI-SUBS)",TOP - Den of Thieves 2: Pantera (2025)
http://m3u.best-smarter.me:80/movie/USERNAME/PASSWORD/1301910.mkv
#EXTINF:-1 tvg-id="" tvg-name="NF - Spartan: Ultimate Team Challenge (2016) (US) S02 E01" tvg-logo="https://image.tmdb.org/t/p/w185/b88VOlhF3Pz1GCQYuPlmdkh62wW.jpg" group-title="NETFLIX REALITY",NF - Spartan: Ultimate Team Challenge (2016) (US) S02 E01
http://m3u.best-smarter.me:80/series/USERNAME/PASSWORD/1346581.mkv
#EXTINF:-1 tvg-ID="Sky News.uk" tvg-name="UK: Sky News" tvg-logo="" group-title="United Kingdom",UK: Sky News
http://bigotvpro.com:8080/USERNAME/PASSWORD/930
#EXTINF:-1 tvg-ID="" tvg-name="The Electric State (2025)" tvg-logo="https://image.tmdb.org/t/p/w600_and_h900_bestv2/1TZ9Er1xEAKizzKKqYVgJIhNkN2.jpg" group-title="Movies: Drama",The Electric State (2025)
http://bigotvpro.com:8080/movie/USERNAME/PASSWORD/189850.mkv
#EXTINF:-1 tvg-id="" tvg-name="EN -  Drag Race All Stars (US) S07 E06" tvg-logo="https://image.tmdb.org/t/p/w154/nQ6MjgKPujYPRQkwP7KoZe349GC.jpg" group-title="ENGLISH SERIES",EN -  Drag Race All Stars (US) S07 E06
http://m3u.best-smarter.me:80/series/USERNAME/PASSWORD/364526.mp4
#EXTINF:-1 tvg-ID="" tvg-name="Young Sheldon (US) S06 E14" tvg-logo="https://image.tmdb.org/t/p/w154/5Gf83qYgLY8Qivn7jpv5nxxZPu6.jpg" group-title="Series: HBO ",Young Sheldon (US) S06 E14
http://bigotvpro.com:8080/series/USERNAME/PASSWORD/139128.mkv
#EXTINF:-1 tvg-id="0" tvg-name="UK: CHANNEL 4 4K ◉" tvg-logo="http://icon-tmdb.me/stalker_portal/misc/logos/320/12107.jpg?7219" group-title="UK| GENERAL ᴴᴰ/ᴿᴬᵂ",UK: CHANNEL 4 4K ◉
http://m3u.best-smarter.me:80/USERNAME/PASSWORD/162113
    `.trim();

describe("parseM3U Entries", () => {
    const entries = parseM3U(mockM3U);
    it("Should have parsed all entries", () => {
        expect(entries.length).toBe(9);
    });

    it("All entries urls should contain /USERNAME/  and /PASSWORD/", () => {
        const arrUrlsAreWithUsrnameAndPassword = entries.filter((entry) => entry.url.includes("/USERNAME/") && entry.url.includes("/PASSWORD/"));
        expect(arrUrlsAreWithUsrnameAndPassword.length).toBe(9);
    });
});

describe("Each value should have been parsed corretly", () => {
    const entries = parseM3U(mockM3U);

    it("Testring entry 0", () => {
        //#EXTINF:-1 tvg-id="" tvg-name="#### GENERAL HD/4K ####" tvg-logo="" group-title="UK| GENERAL ᴴᴰ/ᴿᴬᵂ",#### GENERAL HD/4K ####
        expect(entries[0].tvgId).toBe("");
        expect(entries[0].tvgName).toBe("#### GENERAL HD/4K ####");
        expect(entries[0].tvgLogo).toBe("");
        expect(entries[0].groupTitle).toBe("UK| GENERAL ᴴᴰ/ᴿᴬᵂ");
        expect(entries[0].name).toBe("#### GENERAL HD/4K ####");
        expect(entries[0].url).toBe("http://m3u.best-smarter.me:80/USERNAME/PASSWORD/1015349");
    });

    it("Testring entry 1", () => {
        //#EXTINF:-1 tvg-id="BBCOneOxford.uk" tvg-name="UK: BBC ONE LONDON 4K ◉" tvg-logo="http://icon-tmdb.me/stalker_portal/misc/logos/320/11987.jpg?90172" group-title="UK| GENERAL ᴴᴰ/ᴿᴬᵂ",UK: BBC ONE LONDON 4K ◉
        expect(entries[1].tvgId).toBe("BBCOneOxford.uk");
        expect(entries[1].tvgName).toBe("UK: BBC ONE LONDON 4K ◉");
        expect(entries[1].tvgLogo).toBe("http://icon-tmdb.me/stalker_portal/misc/logos/320/11987.jpg?90172");
        expect(entries[1].groupTitle).toBe("UK| GENERAL ᴴᴰ/ᴿᴬᵂ");
        expect(entries[1].name).toBe("UK: BBC ONE LONDON 4K ◉");
        expect(entries[1].url).toBe("http://m3u.best-smarter.me:80/USERNAME/PASSWORD/497001");
    });

    it("Testring entry 2", () => {
        //#EXTINF:-1 tvg-id="" tvg-name="TOP - Den of Thieves 2: Pantera (2025)" tvg-logo="https://image.tmdb.org/t/p/w600_and_h900_bestv2/p6Zz0gETvkC33Pst1h6sh9Js6x.jpg" group-title="TOP MOVIES BLURAY (MULTI-SUBS)",TOP - Den of Thieves 2: Pantera (2025)
        expect(entries[2].tvgId).toBe("");
        expect(entries[2].tvgName).toBe("TOP - Den of Thieves 2: Pantera (2025)");
        expect(entries[2].tvgLogo).toBe("https://image.tmdb.org/t/p/w600_and_h900_bestv2/p6Zz0gETvkC33Pst1h6sh9Js6x.jpg");
        expect(entries[2].groupTitle).toBe("TOP MOVIES BLURAY (MULTI-SUBS)");
        expect(entries[2].name).toBe("TOP - Den of Thieves 2: Pantera (2025)");
        expect(entries[2].url).toBe("http://m3u.best-smarter.me:80/movie/USERNAME/PASSWORD/1301910.mkv");
    });

    it("Testring entry 3", () => {
        //#EXTINF:-1 tvg-id="" tvg-name="NF - Spartan: Ultimate Team Challenge (2016) (US) S02 E01" tvg-logo="https://image.tmdb.org/t/p/w185/b88VOlhF3Pz1GCQYuPlmdkh62wW.jpg" group-title="NETFLIX REALITY",NF - Spartan: Ultimate Team Challenge (2016) (US) S02 E01
        expect(entries[3].tvgId).toBe("");
        expect(entries[3].tvgName).toBe("NF - Spartan: Ultimate Team Challenge (2016) (US) S02 E01");
        expect(entries[3].tvgLogo).toBe("https://image.tmdb.org/t/p/w185/b88VOlhF3Pz1GCQYuPlmdkh62wW.jpg");
        expect(entries[3].groupTitle).toBe("NETFLIX REALITY");
        expect(entries[3].name).toBe("NF - Spartan: Ultimate Team Challenge (2016) (US) S02 E01");
        expect(entries[3].url).toBe("http://m3u.best-smarter.me:80/series/USERNAME/PASSWORD/1346581.mkv");
    });
    it("Testring entry 4", () => {
        //#EXTINF:-1 tvg-ID="Sky News.uk" tvg-name="UK: Sky News" tvg-logo="" group-title="United Kingdom",UK: Sky News
        expect(entries[4].tvgId).toBe("Sky News.uk");
        expect(entries[4].tvgName).toBe("UK: Sky News");
        expect(entries[4].tvgLogo).toBe("");
        expect(entries[4].groupTitle).toBe("United Kingdom");
        expect(entries[4].name).toBe("UK: Sky News");
        expect(entries[4].url).toBe("http://bigotvpro.com:8080/USERNAME/PASSWORD/930");
    });

    it("Testring entry 5", () => {
        //#EXTINF:-1 tvg-ID="" tvg-name="The Electric State (2025)" tvg-logo="https://image.tmdb.org/t/p/w600_and_h900_bestv2/1TZ9Er1xEAKizzKKqYVgJIhNkN2.jpg" group-title="Movies: Drama",The Electric State (2025)
        expect(entries[5].tvgId).toBe("");
        expect(entries[5].tvgName).toBe("The Electric State (2025)");
        expect(entries[5].tvgLogo).toBe("https://image.tmdb.org/t/p/w600_and_h900_bestv2/1TZ9Er1xEAKizzKKqYVgJIhNkN2.jpg");
        expect(entries[5].groupTitle).toBe("Movies: Drama");
        expect(entries[5].name).toBe("The Electric State (2025)");
        expect(entries[5].url).toBe("http://bigotvpro.com:8080/movie/USERNAME/PASSWORD/189850.mkv");
    });

    it("Testring entry 6", () => {
        //#EXTINF:-1 tvg-id="" tvg-name="EN -  Drag Race All Stars (US) S07 E06" tvg-logo="https://image.tmdb.org/t/p/w154/nQ6MjgKPujYPRQkwP7KoZe349GC.jpg" group-title="ENGLISH SERIES",EN -  Drag Race All Stars (US) S07 E06
        expect(entries[6].tvgId).toBe("");
        expect(entries[6].tvgName).toBe("EN -  Drag Race All Stars (US) S07 E06");
        expect(entries[6].tvgLogo).toBe("https://image.tmdb.org/t/p/w154/nQ6MjgKPujYPRQkwP7KoZe349GC.jpg");
        expect(entries[6].groupTitle).toBe("ENGLISH SERIES");
        expect(entries[6].name).toBe("EN -  Drag Race All Stars (US) S07 E06");
    });
    it("Testring entry 7", () => {
        //#EXTINF:-1 tvg-ID="" tvg-name="Young Sheldon (US) S06 E14" tvg-logo="https://image.tmdb.org/t/p/w154/5Gf83qYgLY8Qivn7jpv5nxxZPu6.jpg" group-title="Series: HBO ",Young Sheldon (US) S06 E14
        expect(entries[7].tvgId).toBe("");
        expect(entries[7].tvgName).toBe("Young Sheldon (US) S06 E14");
        expect(entries[7].tvgLogo).toBe("https://image.tmdb.org/t/p/w154/5Gf83qYgLY8Qivn7jpv5nxxZPu6.jpg");
        expect(entries[7].groupTitle).toBe("Series: HBO ");
        expect(entries[7].name).toBe("Young Sheldon (US) S06 E14");
        expect(entries[7].url).toBe("http://bigotvpro.com:8080/series/USERNAME/PASSWORD/139128.mkv");
    });

    it("Testring entry 8", () => {
        //#EXTINF:-1 tvg-id="0" tvg-name="UK: CHANNEL 4 4K ◉" tvg-logo="http://icon-tmdb.me/stalker_portal/misc/logos/320/12107.jpg?7219" group-title="UK| GENERAL ᴴᴰ/ᴿᴬᵂ",UK: CHANNEL 4 4K ◉
        expect(entries[8].tvgId).toBe("0");
        expect(entries[8].tvgName).toBe("UK: CHANNEL 4 4K ◉");
        expect(entries[8].tvgLogo).toBe("http://icon-tmdb.me/stalker_portal/misc/logos/320/12107.jpg?7219");
        expect(entries[8].groupTitle).toBe("UK| GENERAL ᴴᴰ/ᴿᴬᵂ");
        expect(entries[8].name).toBe("UK: CHANNEL 4 4K ◉");
        expect(entries[8].url).toBe("http://m3u.best-smarter.me:80/USERNAME/PASSWORD/162113");
    });
});

it("Each entry should be parsed correctly rest", () => {});
