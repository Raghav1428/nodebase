import { google } from "googleapis";
import { decrypt, encrypt } from "@/lib/encryption";
import prisma from "@/lib/db";

// OAuth2 configuration
const SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
];

function getBaseUrl(): string {
    return process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
}

export function getOAuth2Client() {
    const baseUrl = getBaseUrl();
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${baseUrl}/api/auth/google-sheets/callback`
    );
}

export function getAuthUrl(state: string) {
    const oauth2Client = getOAuth2Client();
    return oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        state,
        prompt: "consent", // Force consent to get refresh token
    });
}

export async function getTokensFromCode(code: string) {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
}

export interface GoogleSheetsCredentialValue {
    access_token: string;
    refresh_token: string;
    expiry_date: number;
    email?: string;
}

export async function getAuthedSheetsClient(credentialId: string, userId: string) {
    const credential = await prisma.credential.findUnique({
        where: { id: credentialId, userId },
    });

    if (!credential) {
        throw new Error("Google Sheets credential not found");
    }

    const tokenData: GoogleSheetsCredentialValue = JSON.parse(decrypt(credential.value));
    const oauth2Client = getOAuth2Client();

    oauth2Client.setCredentials({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expiry_date: tokenData.expiry_date,
    });

    // Check if token is expired and refresh if needed
    if (tokenData.expiry_date && tokenData.expiry_date < Date.now()) {
        const { credentials } = await oauth2Client.refreshAccessToken();

        // Update stored credentials
        const newTokenData: GoogleSheetsCredentialValue = {
            access_token: credentials.access_token || tokenData.access_token,
            refresh_token: credentials.refresh_token || tokenData.refresh_token,
            expiry_date: credentials.expiry_date || Date.now() + 3600000,
            email: tokenData.email,
        };

        await prisma.credential.update({
            where: { id: credentialId },
            data: { value: encrypt(JSON.stringify(newTokenData)) },
        });

        oauth2Client.setCredentials(credentials);
    }

    return google.sheets({ version: "v4", auth: oauth2Client });
}

export async function createSpreadsheet(
    credentialId: string,
    userId: string,
    title: string,
    data: any[][]
) {
    const sheets = await getAuthedSheetsClient(credentialId, userId);

    const spreadsheet = await sheets.spreadsheets.create({
        requestBody: {
            properties: { title },
            sheets: [{ properties: { title: "Sheet1" } }],
        },
    });

    const spreadsheetId = spreadsheet.data.spreadsheetId;
    const sheetId = spreadsheet.data.sheets?.[0]?.properties?.sheetId || 0;

    if (!spreadsheetId) {
        throw new Error("Failed to create spreadsheet");
    }

    if (data && data.length > 0) {
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: "Sheet1!A1",
            valueInputOption: "RAW",
            requestBody: { values: data },
        });

        const boldRowRequests: any[] = [];
        const maxColumns = Math.max(...data.map(row => row.length));

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const isCategoryHeading = row.length === 1 &&
                typeof row[0] === 'string' &&
                row[0] === row[0].toUpperCase() &&
                row[0].length > 0 &&
                row[0] !== "";

            const isColumnHeader = (i === 0 ||
                (i > 0 && data[i - 1].length === 1 && data[i - 1][0] !== "")) &&
                row.length > 1;

            if (isCategoryHeading || isColumnHeader) {
                boldRowRequests.push({
                    repeatCell: {
                        range: {
                            sheetId,
                            startRowIndex: i,
                            endRowIndex: i + 1,
                            startColumnIndex: 0,
                            endColumnIndex: maxColumns,
                        },
                        cell: {
                            userEnteredFormat: isCategoryHeading ? {
                                textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                                backgroundColor: { red: 0.2, green: 0.6, blue: 0.86 },
                            } : {
                                textFormat: { bold: true },
                                backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                            },
                        },
                        fields: "userEnteredFormat(textFormat,backgroundColor)",
                    },
                });
            }
        }

        try {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: {
                    requests: [
                        ...boldRowRequests,
                        {
                            autoResizeDimensions: {
                                dimensions: {
                                    sheetId,
                                    dimension: "COLUMNS",
                                    startIndex: 0,
                                    endIndex: maxColumns,
                                },
                            },
                        },
                    ],
                },
            });
        } catch (formatError) {
            console.log("Could not apply formatting (non-critical):", formatError);
        }
    }

    return {
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
}

export async function appendToSpreadsheet(
    credentialId: string,
    userId: string,
    spreadsheetId: string,
    data: any[][]
) {
    const sheets = await getAuthedSheetsClient(credentialId, userId);

    const currentData = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Sheet1",
    });

    const lastRow = (currentData.data.values?.length || 0) + 2; // +2 to leave a blank line

    const spreadsheetMeta = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: "sheets.properties",
    });
    const sheetId = spreadsheetMeta.data.sheets?.[0]?.properties?.sheetId || 0;

    const response = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Sheet1!A${lastRow}`,
        valueInputOption: "RAW",
        requestBody: { values: data },
    });

    if (data && data.length > 0) {
        const boldRowRequests: any[] = [];
        const maxColumns = Math.max(...data.map(row => row.length));
        const startRowIndex = lastRow - 1;

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const isCategoryHeading = row.length === 1 &&
                typeof row[0] === 'string' &&
                row[0] === row[0].toUpperCase() &&
                row[0].length > 0 &&
                row[0] !== "";

            const isColumnHeader = (i === 0 ||
                (i > 0 && data[i - 1].length === 1 && data[i - 1][0] !== "")) &&
                row.length > 1;

            if (isCategoryHeading || isColumnHeader) {
                boldRowRequests.push({
                    repeatCell: {
                        range: {
                            sheetId,
                            startRowIndex: startRowIndex + i,
                            endRowIndex: startRowIndex + i + 1,
                            startColumnIndex: 0,
                            endColumnIndex: maxColumns,
                        },
                        cell: {
                            userEnteredFormat: isCategoryHeading ? {
                                textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                                backgroundColor: { red: 0.2, green: 0.6, blue: 0.86 },
                            } : {
                                textFormat: { bold: true },
                                backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                            },
                        },
                        fields: "userEnteredFormat(textFormat,backgroundColor)",
                    },
                });
            }
        }

        if (boldRowRequests.length > 0) {
            try {
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId,
                    requestBody: { requests: boldRowRequests },
                });
            } catch (formatError) {
                console.log("Could not apply formatting (non-critical):", formatError);
            }
        }
    }

    return {
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        updatedRange: response.data.updatedRange,
        updatedRows: data.length,
    };
}

export function objectsToSheetData(objects: Record<string, any>[]): any[][] {
    if (!objects || objects.length === 0) return [];

    const hasNestedItems = objects.some(obj =>
        Array.isArray(obj.items) || Array.isArray(obj.details)
    );

    if (hasNestedItems) {
        return flattenNestedData(objects);
    }

    const hasCategory = objects.length > 0 && 'category' in objects[0];
    if (hasCategory) {
        return groupByCategoryToSections(objects);
    }

    const rawHeaders = Object.keys(objects[0]);
    const headers = rawHeaders.map(h =>
        h.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    );

    const rows = objects.map(obj => rawHeaders.map(h => {
        const value = obj[h];
        if (typeof value === "object" && value !== null) {
            return JSON.stringify(value);
        }
        return value ?? "";
    }));

    return [headers, ...rows];
}

function groupByCategoryToSections(objects: Record<string, any>[]): any[][] {
    const allRows: any[][] = [];

    const groups = new Map<string, Record<string, any>[]>();
    for (const obj of objects) {
        const category = obj.category || "Other";
        if (!groups.has(category)) {
            groups.set(category, []);
        }
        groups.get(category)!.push(obj);
    }

    for (const [categoryName, items] of groups) {
        const allKeysSet = new Set<string>();
        for (const item of items) {
            Object.keys(item).forEach(k => {
                if (k !== 'category') allKeysSet.add(k);
            });
        }
        const categoryKeys = Array.from(allKeysSet);
        const formattedHeaders = categoryKeys.map(h =>
            h.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        );

        allRows.push([categoryName.toUpperCase()]);

        allRows.push(formattedHeaders);

        for (const item of items) {
            const row = categoryKeys.map(key => {
                const value = item[key];
                if (typeof value === "object" && value !== null) {
                    return JSON.stringify(value);
                }
                return value ?? "";
            });
            allRows.push(row);
        }

        allRows.push([""]);
    }

    if (allRows.length > 0 && allRows[allRows.length - 1][0] === "") {
        allRows.pop();
    }

    return allRows;
}

function flattenNestedData(data: Record<string, any>[]): any[][] {
    const allRows: any[][] = [];

    for (const category of data) {
        const categoryName = category.category || category.name || "Data";
        const items = category.items || category.details || [];

        if (Array.isArray(items) && items.length > 0) {
            allRows.push([categoryName.toUpperCase()]);

            const headers = Object.keys(items[0]);
            allRows.push(headers.map(h => h.charAt(0).toUpperCase() + h.slice(1).replace(/_/g, ' ')));

            for (const item of items) {
                const row = headers.map(key => {
                    const value = item[key];
                    if (typeof value === "object" && value !== null) {
                        return JSON.stringify(value);
                    }
                    return value ?? "";
                });
                allRows.push(row);
            }

            allRows.push([""]);
        }
    }
    if (allRows.length > 0 && allRows[allRows.length - 1][0] === "") {
        allRows.pop();
    }

    return allRows;
}
