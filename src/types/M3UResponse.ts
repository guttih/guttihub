// types/M3UResponse.ts
import { M3UEntry } from "./M3UEntry";
import { ContentCategoryFieldLabel } from "./ContentCategoryFieldLabel";
import { StreamingService } from "./StreamingService";

type ServerUrl = StreamingService["server"];

export interface M3UResponse {
  servers: ServerUrl[];
  entries: M3UEntry[];
  formats: string[];
  categories: ContentCategoryFieldLabel[];
}
