import { StreamFormat } from "@/types/StreamFormat";
import { ContentCategoryFieldLabel } from "@/types/ContentCategoryFieldLabel";
import { TextFilter } from "@/types/TextFilter";

export interface FetchM3URequest {
    url: string;
    snapshotId?: string;
    pagination: {
        offset: number;
        limit: number;
    };
    filters: {
        name?: TextFilter;
        groupTitle?: TextFilter;
        tvgId?: TextFilter;
        format?: StreamFormat;
        category?: ContentCategoryFieldLabel;
    };
}
