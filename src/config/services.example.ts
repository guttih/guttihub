import { StreamingService } from "@/types/StreamingService";

if (process.env.NODE_ENV === "production") {
    throw new Error("services.ts must not be empty in production!");
}

export const services: StreamingService[] = [
    {
        id: "demo-service",
        name: "Example IPTV",
        server: "http://example.com",
        refreshUrl: "http://example.com/get.php?username=USERNAME&password=PASSWORD&type=m3u_plus&output=ts",
        viewingBaseUrl: "http://example.com/USERNAME/PASSWORD",
        username: "USERNAME",
        password: "PASSWORD",
    },
];
