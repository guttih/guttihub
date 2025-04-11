// types/ApiResponse.ts

import { NextResponse } from "next/server";

/**
 * Represents a successful API response.
 *
 * @template T - The type of the returned data
 */
export interface SuccessResponse<T> {
    success: true;
    data: T;
}

/**
 * Represents a failed API response.
 */
export interface ErrorResponse {
    success: false;
    error: string;
    statusCode?: number;
}

/**
 * Union type for any API response that returns either:
 *  - a success object (with `data`)
 *  - or an error object (with `error`)
 *
 * @example
 * const response: ApiResponse<User[]> = await fetchUsers();
 * if (!response.success) {
 *   console.error(response.error);
 * } else {
 *   console.log(response.data); // ✅ Safe to use
 * }
 */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

/**
 * Helper function to create a typed success response.
 *
 * @template T - The type of the returned data
 * @param data - The data to return in the response
 * @param status - Optional HTTP status code (default is 200)
 * @returns Next.js NextResponse containing the data
 *
 * @example
 * return makeSuccessResponse<User>(newUser, 201); // Created
 */
export function makeSuccessResponse<T>(data: T, status: number = 200): NextResponse<SuccessResponse<T>> {
    return NextResponse.json({ success: true, data }, { status });
}

/**
 * Helper function to create an error response.
 *
 * @param error - Error message
 * @param statusCode - HTTP status code to return (default: 400)
 * @returns Next.js NextResponse with error details
 *
 * @example
 * return makeErrorResponse("User not found", 404);
 */
export function makeErrorResponse(error: string, statusCode = 400): NextResponse<ErrorResponse> {
    return NextResponse.json({ success: false, error, statusCode }, { status: statusCode });
}
