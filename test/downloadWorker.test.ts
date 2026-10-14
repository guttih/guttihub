import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { afterEach, describe, expect, it } from "vitest";
const execute = promisify(execFile);
const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });

describe("download worker with local fake curl", () => {
    it("stops the curl child and records cancellation", async () => {
        const dir = await fs.mkdtemp(path.join(os.tmpdir(), "download-worker-"));
        dirs.push(dir);
        await fs.writeFile(path.join(dir, "curl"), `#!/bin/bash
if [[ "$*" == *"--max-time"* ]]; then printf 'Content-Length: 4\\r\\n'; exit 0; fi
while [[ $# -gt 0 ]]; do
    if [[ "$1" == "--output" ]]; then printf part > "$2"; break; fi
    shift
done
exec sleep 30
`, { mode: 0o700 });
        const output = path.join(dir, "cancel.mp4");
        const task = execute("bash", [path.resolve("src/scripts/download.sh"), "--managedQueue", "--baseUrl", "http://unused.invalid", "--cacheKey", "test", "--url", "http://unused.invalid/movie.mp4", "--outputFile", output, "--user", "test"], { env: { ...process.env, PATH: `${dir}:${process.env.PATH}` } });
        try {
            let ready = false;
            for (let attempt = 0; attempt < 100; attempt++) {
                const status = await fs.readFile(`${output}.status`, "utf8").catch(() => "");
                if (/^PID=/m.test(status)) { ready = true; break; }
                await new Promise((resolve) => setTimeout(resolve, 10));
            }
            expect(ready).toBe(true);
            task.child.kill("SIGTERM");
            await task;
            expect(await fs.readFile(`${output}.status`, "utf8")).toContain("STATUS=stopped");
            await expect(fs.access(`${output}.part`)).rejects.toThrow();
        } finally { task.child.kill("SIGTERM"); }
    });
    for (const fail of [false, true]) {
        it(fail ? "records curl failure even with errexit enabled" : "writes successful output and terminal status", async () => {
            const dir = await fs.mkdtemp(path.join(os.tmpdir(), "download-worker-"));
            dirs.push(dir);
            const fake = path.join(dir, "curl");
            await fs.writeFile(fake, `#!/bin/bash
if [[ "$*" == *"--max-time"* ]]; then
    printf 'Content-Length: 4\\r\\n'
    exit 0
fi
${fail ? "exit 22" : `while [[ $# -gt 0 ]]; do
    if [[ "$1" == "--output" ]]; then printf data > "$2"; exit 0; fi
    shift
done
exit 90`}
`, { mode: 0o700 });
            const output = path.join(dir, "movie.mp4");
            const task = execute("bash", [path.resolve("src/scripts/download.sh"), "--managedQueue", "--baseUrl", "http://unused.invalid", "--cacheKey", "test", "--url", "http://unused.invalid/movie.mp4", "--outputFile", output, "--user", "test"], { env: { ...process.env, PATH: `${dir}:${process.env.PATH}` } });
            if (fail) await expect(task).rejects.toMatchObject({ code: 22 });
            else await task;
            const status = await fs.readFile(`${output}.status`, "utf8");
            expect(status).toContain(fail ? "STATUS=error" : "STATUS=done");
            expect(status).toContain("ACTUAL_STOP=");
            if (!fail) expect(await fs.readFile(output, "utf8")).toBe("data");
        });
    }
});
