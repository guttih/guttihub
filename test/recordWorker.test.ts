import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { afterEach, describe, expect, it } from "vitest";

const execute = promisify(execFile);
const dirs: string[] = [];
afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function fixture(mode: string) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "record-worker-"));
    dirs.push(dir);
    await fs.writeFile(path.join(dir, "curl"), "#!/bin/bash\nexit 0\n", { mode: 0o700 });
    await fs.writeFile(path.join(dir, "ffmpeg"), `#!/bin/bash
out="\${!#}"
printf '%s\\n' "$*" >> "$TEST_DIR/commands"
if [[ "$*" == *"-f hls"* || "$*" == *"-f mpegts"* ]]; then
    echo $$ >> "$TEST_DIR/capture-pids"
    if [[ "$MODE" == no-media ]]; then exit 1; fi
    if [[ "$out" == *.m3u8 ]]; then
        printf '#EXTM3U\\n#EXTINF:4,\\nsegment.ts\\n' > "$out"
    else printf part > "$out"; fi
    if [[ "$MODE" == retry && "$out" == *attempt_1* ]]; then exit 1; fi
    if [[ "$MODE" == stuck ]]; then trap '' INT TERM; fi
    while true; do sleep 1; done
elif [[ "$out" == *.opt.mp4 ]]; then
    if [[ "$MODE" == optimize-timeout ]]; then exec sleep 30; fi
    if [[ "$MODE" == optimize-fail ]]; then printf partial > "$out"; exit 1; fi
    printf optimized > "$out"
else
    if [[ "$MODE" == package-timeout ]]; then printf partial > "$out"; exec sleep 30; fi
    cp "$(dirname "$out")/record_parts/inputs.txt" "$TEST_DIR/packaged-inputs"
    printf packaged > "$out"
fi
`, { mode: 0o700 });
    if (mode === "optimize-timeout" || mode === "package-timeout") {
        await fs.writeFile(path.join(dir, "timeout"), `#!/bin/bash
args=()
for arg in "$@"; do
    if [[ "$arg" == 21608s || "$arg" == 3602s ]]; then arg=1s; fi
    args+=("$arg")
done
exec /usr/bin/timeout "\${args[@]}"
`, { mode: 0o700 });
    }
    const output = path.join(dir, "record.mp4");
    const task = execute("bash", [path.resolve("src/scripts/record.sh"),
        "--url", "http://unused.invalid/live", "--duration", mode === "retry" ? "5" : "2",
        "--user", "test", "--outputFile", output, "--recordingType", mode === "ts" ? "ts" : "hls",
        "--baseUrl", "http://unused.invalid", "--cacheKey", "test"], {
        env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, TEST_DIR: dir, MODE: mode },
        timeout: 25000,
    });
    return { dir, output, task };
}

describe("recording recovery and deadlines", () => {
    it("retries an early exit, preserves parts and uses the original deadline", async () => {
        const start = Date.now();
        const { dir, output, task } = await fixture("retry");
        await task;
        expect(Date.now() - start).toBeLessThan(9000);
        const inputs = await fs.readFile(path.join(dir, "packaged-inputs"), "utf8");
        expect(inputs).toContain("attempt_1.m3u8");
        expect(inputs).toContain("attempt_2.m3u8");
        expect(await fs.readFile(`${output}.status`, "utf8")).toContain("STATUS=done");
        expect(await fs.readFile(path.join(dir, "commands"), "utf8")).toContain("-reconnect_on_network_error 1");
    }, 15000);

    it("also packages TS capture parts", async () => {
        const { dir, output, task } = await fixture("ts");
        await task;
        expect(await fs.readFile(path.join(dir, "packaged-inputs"), "utf8")).toContain("attempt_1.ts");
        expect(await fs.readFile(`${output}.status`, "utf8")).toContain("STATUS=done");
    }, 10000);

    it("forces a stuck capture to exit after the deadline and grace period", async () => {
        const { dir, output, task } = await fixture("stuck");
        await task;
        const pids = (await fs.readFile(path.join(dir, "capture-pids"), "utf8")).trim().split("\n");
        for (const pid of pids) {
            const stat = await fs.readFile(`/proc/${pid}/stat`, "utf8").catch(() => "");
            expect(stat === "" || stat.split(") ")[1]?.startsWith("Z ")).toBe(true);
        }
        expect(await fs.readFile(`${output}.status`, "utf8")).toContain("STATUS=done");
    }, 20000);

    it("keeps the packaged MP4 if optimization fails", async () => {
        const { output, task } = await fixture("optimize-fail");
        await task;
        expect(await fs.readFile(output, "utf8")).toBe("packaged");
        expect(await fs.readFile(`${output}.status`, "utf8")).toContain("WARNING=Optimization failed");
        await expect(fs.access(`${output}.opt.mp4`)).rejects.toThrow();
    }, 10000);

    it("bounds optimization separately and preserves packaged output on timeout", async () => {
        const { output, task } = await fixture("optimize-timeout");
        await task;
        expect(await fs.readFile(output, "utf8")).toBe("packaged");
        expect(await fs.readFile(`${output}.status`, "utf8")).toContain("WARNING=Optimization failed");
    }, 10000);

    it("does not publish a partial MP4 when packaging times out", async () => {
        const { dir, output, task } = await fixture("package-timeout");
        await task;
        expect(await fs.readFile(`${output}.status`, "utf8")).toContain("STATUS=error");
        await expect(fs.access(output)).rejects.toThrow();
        await expect(fs.access(path.join(dir, "record_parts", "attempt_1.m3u8"))).resolves.toBeUndefined();
    }, 10000);

    it("reports failure when the entire capture has no media", async () => {
        const { output, task } = await fixture("no-media");
        await task;
        expect(await fs.readFile(`${output}.status`, "utf8")).toContain("STATUS=error");
        await expect(fs.access(output)).rejects.toThrow();
    }, 10000);

    it("stops capture through the wrapper and still finalizes", async () => {
        const { dir, output, task } = await fixture("stop");
        try {
            for (let i = 0; i < 100; i++) {
                if (await fs.access(path.join(dir, "capture-pids")).then(() => true, () => false)) break;
                await new Promise((resolve) => setTimeout(resolve, 10));
            }
            await execute("bash", [path.resolve("src/scripts/stop-record.sh"), "--outputFile", output]);
            await task;
            expect(await fs.readFile(`${output}.status`, "utf8")).toContain("STATUS=stopped");
            expect(await fs.readFile(output, "utf8")).toBe("optimized");
        } finally { task.child.kill("SIGTERM"); }
    }, 15000);
});
