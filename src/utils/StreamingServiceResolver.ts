import { services as defaultServices } from '@/config/services';
import { M3UEntry } from '@/types/M3UEntry';
import { StreamingService } from '@/types/StreamingService';
import { StreamingServiceUrlValues } from '@/types/StreamingServiceUrlValues';
import { unsanitizeUrl } from '@/utils/urlSanitizer';

export class StreamingServiceResolver {
  private services: StreamingService[];

  constructor(services?: StreamingService[]) {
    this.services = services ?? defaultServices;
  }

  findById(serviceId: string): StreamingService | undefined {
    return this.services.find((s) => s.id === serviceId);
  }

  findByViewingUrl(viewingBaseUrl: string): StreamingService | undefined {
    return this.services.find((service) => {
      const serviceIndex = viewingBaseUrl.indexOf(service.server);
      const usernameIndex = viewingBaseUrl.indexOf(service.username);
      const passwordIndex = viewingBaseUrl.indexOf(service.password);
      return serviceIndex !== -1 && usernameIndex >= serviceIndex && passwordIndex >= usernameIndex;
    });
  }

  findByServer(server: string): StreamingService | undefined {
    return this.services.find((s) => s.server === server);
  }

  findByUrlValues(values: StreamingServiceUrlValues): StreamingService | undefined {
    return this.services.find(
      (s) => s.server === values.server && s.username === values.username && s.password === values.password
    );
  }

  static getUniquePathsFromUrl(entries: M3UEntry[], mustStartWith: string | null = null): string[] {
    const urls = entries
      .filter((entry) => !mustStartWith || entry.url.startsWith(mustStartWith))
      .map((entry) => {
        try {
          const url = new URL(entry.url);
          const pathParts = url.pathname.split('/').filter(Boolean);
          if (pathParts.length > 0) pathParts.pop(); // Always remove last segment
          return `${url.origin}/${pathParts.join('/')}`;
        } catch {
          return ''; // Skip invalid URLs
        }
      })
      .filter(Boolean); // Filter out empty strings or failed URLs
  
    return [...new Set(urls)];
  }
  

  makeViewingUrl(serviceId: string, prefix: string | null, streamId: string): string {
    const service = this.findById(serviceId);
    if (!service) throw new Error(`Service with ID ${serviceId} not found`);
    let url = service.server;
    if (prefix) url += `/${prefix}`;
    return `${url}/${service.username}/${service.password}/${streamId}`;
  }

  static unsanitizeUrl(viewingBaseUrl: string, username: string, password: string): string {
    if (!username || !password) throw new Error('Username and password required');
    return unsanitizeUrl(viewingBaseUrl, username, password);
  }

  static unsanitizeUrlFromUrl(viewingBaseUrl: string, services = defaultServices): string {
    const resolver = new StreamingServiceResolver(services);
    const service = resolver.findByServer(viewingBaseUrl);
    return service ? unsanitizeUrl(viewingBaseUrl, service.username, service.password) : viewingBaseUrl;
  }

  static splitStreamingSearchUrl(viewingBaseUrl: string): StreamingServiceUrlValues | undefined {
    try {
      const parsed = new URL(viewingBaseUrl);
      const pathParts = parsed.pathname.split('/').filter(Boolean);

      const result: StreamingServiceUrlValues = {
        server: parsed.origin.includes(':') ? `${parsed.origin}:80` : parsed.origin,
        pathStart: '',
        username: '',
        password: '',
      };

      if (['movie', 'series'].includes(pathParts[0])) {
        result.pathStart = pathParts.shift()!;
      }

      if (pathParts.length < 2) return undefined;

      result.username = pathParts[0];
      result.password = pathParts[1];
      return result;
    } catch {
      return undefined;
    }
  }

  static extractLastPartOfUrl(url: string): string {
    try {
      const parts = new URL(url).pathname.split('/').filter(Boolean);
      return parts.at(-1) || '';
    } catch {
      return '';
    }
  }
}
