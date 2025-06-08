// src/utils/logger.ts

function getTimestamp(): string {
    return new Date().toTimeString().slice(0, 8).replace(/:/g, "");
}

function formatMessage(level: string, message: string, maybeError?: unknown): string {
    const ts = getTimestamp();
    const base = `[${ts}] [${level.toUpperCase()}] ${message}`;

    if (maybeError instanceof Error && maybeError.stack) {
        return `${base}\n${maybeError.stack}`;
    }

    if (typeof maybeError === "string") {
        return `${base}\n${maybeError}`;
    }

    return base;
}

export const logger = {
    info(message: string, err?: unknown) {
        console.log(formatMessage("info", message, err));
    },

    warn(message: string, err?: unknown) {
        console.warn(formatMessage("warn", message, err));
    },

    error(message: string, err?: unknown) {
        console.error(formatMessage("error", message, err));
    },
    log(message: string, err?: unknown) {
        logger.info(message, err);
    },
};
