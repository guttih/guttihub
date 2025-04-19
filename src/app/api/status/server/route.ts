export async function GET() {
    return new Response(
        JSON.stringify({
            serverTime: new Date().toISOString(),
        })
    );
}
