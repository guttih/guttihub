import { services } from "@/config/services";
import { StreamingService } from "@/types/StreamingService";
import { StreamingServiceUrlValues } from "@/types/StreamingServiceUrlValues";
import { unsanitizeUrl } from "@/utils/urlSanitizer";

/**
 * ServiceController is a utility class that manages streaming services.
 * It provides methods to find services by ID or viewing URL, and to extract the last part of a URL.
 */
export class StreamingServiceResolver {
    static findStreamingServiceById(serviceId: string): StreamingService | undefined {
        return services.find((service) => service.id === serviceId);
    }
    static splitStreamingSearchUrl(viewingBaseUrl: string): StreamingServiceUrlValues | undefined {

        let parsed: URL;
        try {
            parsed = new URL(viewingBaseUrl);
        } catch (err) {
            console.error("Invalid URL:", err);
            return undefined;
        }
        const ret: StreamingServiceUrlValues = {
            server: parsed.origin,
            pathStart: "",
            username: "",
            password: "",
        };
        if (parsed.origin.split(":").length > 1) {
            ret.server += ":80";
        }
        const pathParts = parsed.pathname.split("/").filter((part) => part.length > 0);
        //Now if the first part of path is movie or series we want to remove it
        
        
        // should we also support this kind of strings?  http://bigotvpro.com:8080/get.php?username=k5W1gNfZWQ0C&password=naz4Zgthg3dn&type=m3u_plus&output=ts
        if (pathParts[0] === "movie" || pathParts[0] === "series") {
            ret.pathStart = pathParts[0];
            pathParts.shift();
        }
        
        if (pathParts.length < 2 || !pathParts[0] || !pathParts[1]) {
            return undefined;
        }
        
        ret.username = pathParts[0];
        ret.password = pathParts[1];
        
        return ret;
    }
    
    static findStreamingServiceByStreamingServiceUrlValues(urlValues: StreamingServiceUrlValues): StreamingService | undefined {
        // Remove the last part of the url and check if it is in the services array
        console.log(`searching for service with url values`, urlValues);  // Debug line
        if (!urlValues) {
            return undefined;
        }
        return services.find(
            (service) => service.server === urlValues.server && service.username === urlValues.username && service.password === urlValues.password
        );
    }

    static findStreamingServiceByServerValue(ServerValue: string): StreamingService | undefined {
        if (!ServerValue) {
            return undefined;
        }
        return services.find((service) => service.server === ServerValue);
    }

    static unsanitizeUrl(viewingBaseUrl: string, username: string, password: string): string {
        if (!username || !password) {
            throw new Error("Username and password are required to unsanitizeUrl the URL in ServiceController.");
        }
        return unsanitizeUrl(viewingBaseUrl, username, password);
    }

    static unsanitizeUrlFromUrl(viewingBaseUrl: string): string  {
        if (!viewingBaseUrl) {
            throw new Error("viewingBaseUrl is required to unsanitizeUrl the URL in ServiceController.");
        }
        const service = StreamingServiceResolver.findStreamingServiceByServerValue(viewingBaseUrl);
        if (!service) {
            return viewingBaseUrl;
        }

        
        return unsanitizeUrl(viewingBaseUrl, service.username, service.password);
    }

    static sanitizeUrl(viewingBaseUrl: string, username: string, password: string): string {
        if (!username || !password) {
            throw new Error("Username and password are required to sanitize the URL in ServiceController.");
        }

        return this.sanitizeUrl(viewingBaseUrl, username, password);
    }

    static findStreamingServiceByViewingUrl(viewingBaseUrl: string): StreamingService | undefined {
        const service = services.find((service) => {
            const serviceIndex = viewingBaseUrl.indexOf(service.server);
            const usernameIndex = viewingBaseUrl.indexOf(service.username);
            const passwordIndex = viewingBaseUrl.indexOf(service.password);
            return serviceIndex !== -1 && usernameIndex >= serviceIndex && passwordIndex >= usernameIndex;
        });
        return service;
    }

    /**
     *
     * @param url - The URL to extract the last part from.
     * @returns the last part of the URL path or an empty string if the URL is invalid.
     */
    static extractLastPartOfUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split("/").filter((part) => part.length > 0);
            return pathParts[pathParts.length - 1] || "";
        } catch (error) {
            console.error("Invalid URL provided:", error);
            return "";
        }
    }

    static makeViewingUrl(serviceId: string, prefix: string | null, streamId: string): string {
        const service = StreamingServiceResolver.findStreamingServiceById(serviceId);
        if (!service) {
            throw new Error(`Service with ID ${serviceId} not found`);
        }
        let url = service.server;
        if (prefix) {
            url += `/${prefix}`;
        }
        url += `/${service.username}/${service.password}/${streamId}`;
        return url;
    }
}
