// We want to map known contents to ContentCateGoriesFieldLabels, We know that "" category is a tv category, "series" is a tv show category and "movies" is a movie category. We want to map them to the ContentCategoriesFieldLabels

export enum ContentCategoryFieldLabel {
    movies = 'Movies',
    series = 'TV Shows',
    tv = 'TV Channels',
    unknown = 'Unknown'
}

//Map the content categories to the ContentCategoriesFieldLabels
export function inferContentCategory(url: string): ContentCategoryFieldLabel {
    try {
        const u = new URL(url);
        const pathParts = u.pathname.split("/").filter(Boolean);
        if (pathParts[0] === "movie") return ContentCategoryFieldLabel.movies;
        if (pathParts[0] === "series") return ContentCategoryFieldLabel.series;
        return ContentCategoryFieldLabel.tv; // no prefix = TV channels
    } catch {
        return ContentCategoryFieldLabel.unknown;
    }
}