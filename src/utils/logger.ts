// src/utils/logger.ts

// src/utils/logger.ts

function getTimestamp(): string {
    return new Date().toISOString();
}

function formatMessage(level: string, args: unknown[]): string {
    const ts = getTimestamp();
    const base = `[${ts}] [${level.toUpperCase()}]`;

    const msg = args.map((arg) => {
        if (arg instanceof Error && arg.stack) return arg.stack;
        if (typeof arg === "object") {
            try {
                return JSON.stringify(arg, null, 2);
            } catch {
                return "[Circular]";
            }
        }
        return String(arg);
    });

    return `${base} ${msg.join(" ")}`;
}

export const logger = {
    info(...args: unknown[]) {
        console.log(formatMessage("info", args));
    },
    warn(...args: unknown[]) {
        console.warn(formatMessage("warn", args));
    },
    error(...args: unknown[]) {
        console.error(formatMessage("error", args));
    },
    debug(...args: unknown[]) {
        if (process.env.NODE_ENV === "development") {
            console.debug(formatMessage("debug", args));
        }
    },
    log(...args: unknown[]) {
        logger.info(...args);
    },
};
