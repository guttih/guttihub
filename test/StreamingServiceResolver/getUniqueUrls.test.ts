import { StreamingServiceResolver } from "@/utils/StreamingServiceResolver";
import { describe, it, expect } from "vitest";
import { M3UEntry } from "@/types/M3UEntry";


const mockEntry:M3UEntry[] = [
    { tvgId: "1", tvgName: "Service1", tvgLogo: "logo1.png", groupTitle: "Group1", name: "Service1", url: "http://example.com/path1/path2" },           //"http://example.com/path1 0
    { tvgId: "2", tvgName: "Service2", tvgLogo: "logo2.png", groupTitle: "Group2", name: "Service2", url: "http://example.com/path1/path3" },           //"http://example.com/path1 0
    { tvgId: "3", tvgName: "Service3", tvgLogo: "logo3.png", groupTitle: "Group3", name: "Service3", url: "http://example.com/path4/path5" },           //"http://example.com/path4 1
    { tvgId: "4", tvgName: "Service4", tvgLogo: "logo4.png", groupTitle: "Group4", name: "Service4", url: "http://example/path4/path5" },               //"http://example/path4     2 
    { tvgId: "5", tvgName: "Service5", tvgLogo: "logo5.png", groupTitle: "Group5", name: "Service5", url: "http://example.com/path1/path2/bull.txt" },  //"http://example.com/path1/path2 3
    { tvgId: "6", tvgName: "Service6", tvgLogo: "logo6.png", groupTitle: "Group6", name: "Service6", url: "http://example.com/path1/path2/bull.txt" },  //"http://example.com/path1/path2 3
    { tvgId: "7", tvgName: "Service7", tvgLogo: "logo7.png", groupTitle: "Group7", name: "Service7", url: "http://example.com/path1/path2/bull.txt" },  //"http://example.com/path1/path2"3
    { tvgId: "8", tvgName: "Service8", tvgLogo: "logo8.png", groupTitle: "Group8", name: "Service8", url: "http://example.com/path1/path2/bull.txt" },  //"http://example.com/path1/path2" 3 -> count = 4
];

describe("StreamingServiceResolver.getUniqueUrls", () => {
  it("should return unique URLs excluding the last part of the path", () => {
    // Mock the services array
    

    const uniqueUrls = StreamingServiceResolver.getUniquePathsFromUrl(mockEntry);
    expect(uniqueUrls.length).toBe(4); // Check that there are 4 unique URLs
    expect(uniqueUrls).toContainEqual("http://example.com/path1");
    expect(uniqueUrls).toContainEqual("http://example.com/path4");
    expect(uniqueUrls).toContainEqual("http://example/path4");
    expect(uniqueUrls).toContainEqual("http://example.com/path1/path2");
    
  });

  it("only want paths that start with http://example", () => {
    // Mock the services array

    const uniqueUrls = StreamingServiceResolver.getUniquePathsFromUrl(mockEntry, "http://example");
    expect(uniqueUrls.length).toBe(4); // Check that there are 4 unique URLs
    expect(uniqueUrls).toContainEqual("http://example.com/path1");
    expect(uniqueUrls).toContainEqual("http://example.com/path4");
    expect(uniqueUrls).toContainEqual("http://example/path4");
    expect(uniqueUrls).toContainEqual("http://example.com/path1/path2");
    
  });

  it("only want paths that start with http://example/path4", () => {
    // Mock the services array

    const uniqueUrls = StreamingServiceResolver.getUniquePathsFromUrl(mockEntry, "http://example/path4");
    expect(uniqueUrls.length).toBe(1); // Check that there are 4 unique URLs
    expect(uniqueUrls).toContainEqual("http://example/path4");
    
  });

  it("Only want paths that start with http://example.com/path1", () => {
    const uniqueUrls = StreamingServiceResolver.getUniquePathsFromUrl(mockEntry, "http://example.com/path1");
    expect(uniqueUrls.length).toBe(2); // Check that there are 4 unique URLs
    expect(uniqueUrls).toContainEqual("http://example.com/path1");
    expect(uniqueUrls).toContainEqual("http://example.com/path1/path2");
    });

});
