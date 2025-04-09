import { appConfig } from "@/config";
import { services } from "@/config/services";
import { StreamingService } from "@/types/StreamingService";
import { StreamingServiceUrlValues } from "@/types/StreamingServiceUrlValues";
import { unsanitizeUrl } from "@/utils/urlSanitizer";

/**
 * ServiceController is a utility class that manages streaming services.
 * It provides methods to find services by ID or viewing URL, and to extract the last part of a URL.
 */
export class ServiceController {
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

        // Preserve port if explicitly present
        const hostParts = parsed.host.split(":");
        const hostWithOptionalPort = hostParts.length === 2 ? `${hostParts[0]}:${hostParts[1]}` : hostParts[0];

        const ret: StreamingServiceUrlValues = {
            server: `${parsed.protocol}//${hostWithOptionalPort}`,
            pathStart: "",
            username: "",
            password: ""
        };
        const pathParts = parsed.pathname.split("/").filter(Boolean);
        //Now if the first part of path is movie or series we want to remove it
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
        //remove the last part of the url and check if it is in the services array
        console.log(`searching for service with url values`, urlValues);
        if (!urlValues) {
            return undefined;
        }
        return services.find(
            (service) => service.server === urlValues.server && service.username === urlValues.username && service.password === urlValues.password
        );
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

    static makeViewingUrl(serviceId: string, prefix: string|null, streamId: string): string {
        const service = ServiceController.findStreamingServiceById(serviceId);
        if (!service) {
            throw new Error(`Service with ID ${serviceId} not found`);
        }
        let url = service.server;
        if (prefix) {
            url += `/${prefix}`;
        }
        url += `/${service.username}/${service.password}/${streamId}`;
        return url
    }

    
    static makeClientUrl(service: StreamingService | undefined, url: string): string { 
        if (!appConfig.hideCredentialsInUrl) {
            return url;
        }

        if (!service) {
            throw new Error("Service passed is undefined cannot create URL");
        }

        // We need to sanitize the URL to hide credentials
        const urlOut = unsanitizeUrl(url, service.username, service.password);
        return urlOut;
    }

    private service: StreamingService | undefined;

    //create a constrctor that accepts a serviceId  //todo: do we need instance of this class?
    constructor(serviceId: string) {
        if (serviceId === undefined) {
            throw new Error("Constructor must be called with a parameter");
        }
        this.service = ServiceController.findStreamingServiceById(serviceId);
        if (!this.service) {
            throw new Error(`Service with ID ${serviceId} not found`);
        }
    }

    
}
