import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    infoJsonExists: vi.fn(), readRecordingJobInfo: vi.fn(), readRecordingJobFile: vi.fn(),
    readJobStatusFile: vi.fn(), readJobLogFile: vi.fn(), isPidRunningFromStatus: vi.fn(),
}));
vi.mock("@/utils/fileHandler", () => ({
    infoJsonExists: mocks.infoJsonExists,
    readRecordingJobInfo: mocks.readRecordingJobInfo,
    readRecordingJobFile: mocks.readRecordingJobFile,
}));
vi.mock("@/utils/resolverUtils", () => ({
    readJobStatusFile: mocks.readJobStatusFile, readJobLogFile: mocks.readJobLogFile,
}));
vi.mock("@/utils/record/recordingJobUtils", () => ({ isPidRunningFromStatus: mocks.isPidRunningFromStatus }));
vi.mock("@/config", () => ({ services: [{ id: "local-recordings", hasFileAccess: true }] }));
import { GET } from "@/app/api/record/monitor/route";

const request = () => new NextRequest("http://localhost/api/record/monitor?cacheKey=test");
beforeEach(() => {
    vi.resetAllMocks();
    mocks.infoJsonExists.mockReturnValue(false);
    mocks.readRecordingJobFile.mockResolvedValue({ recordingId: "record", cacheKey: "test", statusFile: "test.status", logFile: "test.log" });
    mocks.readJobLogFile.mockResolvedValue([]);
    mocks.isPidRunningFromStatus.mockResolvedValue(true);
});

describe("recording monitor status compatibility", () => {
    for (const status of ["recording", "packaging", "optimizing", "done", "stopped", "error"]) {
        it(`returns the latest ${status} status and latest retry path as strings`, async () => {
            mocks.readJobStatusFile.mockResolvedValue({
                STATUS: ["recording", status],
                HLS_PLAYLIST: ["old.m3u8", "attempt_2.m3u8"],
                FFMPEG_PID: ["123", "456"], PID: "789", DURATION: "10800",
                STREAM: "http://example.invalid/live?token=a=b", CAPTURE_ATTEMPT: ["1", "2"],
            });
            const data = await (await GET(request())).json();
            expect(data.currentStatus).toBe(status);
            expect(data.outputFile).toBe("attempt_2.m3u8");
            expect(data.duration).toBe(10800);
            expect(data.statusLines).toContain("STREAM: http://example.invalid/live?token=a=b");
        });
    }
    for (const status of ["done", "stopped", "error"]) {
        it(`preserves finalized ${status} instead of replacing it with done`, async () => {
            mocks.infoJsonExists.mockReturnValue(true);
            mocks.readRecordingJobInfo.mockResolvedValue({
                job: { cacheKey: "test", outputFile: "public/videos/recordings/record.mp4", finalOutputFile: "public/videos/media/saved recording.mp4" }, logs: [],
                status: { STATUS: ["recording", "packaging", status] },
            });
            const data = await (await GET(request())).json();
            expect(data.currentStatus).toBe(status);
            expect(data.outputFile).toBe("public/videos/media/saved recording.mp4");
            expect(data.playbackUrl).toBe("/api/video/local-recordings/media/saved%20recording.mp4");
        });
    }
    it("does not require the previous capture PID to survive a retry", async () => {
        mocks.readJobStatusFile.mockResolvedValue({ STATUS: "recording", FFMPEG_PID: "123", PID: "789" });
        expect((await (await GET(request())).json()).currentStatus).toBe("recording");
        expect(mocks.isPidRunningFromStatus).toHaveBeenCalledWith("test.status");
    });
});
