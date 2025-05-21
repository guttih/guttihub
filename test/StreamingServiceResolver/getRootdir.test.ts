// import { services, outDirectories } from "@/config";
// import { StreamingServiceResolver } from "@/resolvers/StreamingServiceResolver";
// import { describe, it, expect } from "vitest";

// describe("Test Streaamingresolver", () => {
   

//     it("should return MP4 for mp4", () => {
//         const service1 = services[0];
//         const url1= "http://bigotvpro.com:8080/movie/k5W1gNfZWQ0C/naz4Zgthg3dn/192582.mp4"
//         const url2= "http://bigotvpro.com:8080/series/k5W1gNfZWQ0C/naz4Zgthg3dn/122722.mkv"

//         // extract servervalues from url
//         const serverValues1 = StreamingServiceResolver.splitStreamingSearchUrl(url1);
//         // console.log("serverValues1", serverValues1);
//         const serverValues2 = StreamingServiceResolver.splitStreamingSearchUrl(url2);
//         // console.log("serverValues2", serverValues2);
//         // console.log("outDirectories", outDirectories);

//         //ok we need to check if servervalues1.pathStart is in outDirectories.path
//         const pathStart = serverValues1?.pathStart;

//         if (serverValues1?.pathStart) {
//             const path = outDirectories.find((d) => d.path.includes(serverValues1?.pathStart) );
//             console.log("path1", path);
//         }

        

//         //
        
        
//     });

// });
