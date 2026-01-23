import { sendWorkflowExecution } from "@/inngest/utils";
import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { NodeType } from "@/generated/prisma";
import { timingSafeEqual } from "crypto";

function safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    if (bufA.length !== bufB.length) {
        return false;
    }

    return timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const workflowId = url.searchParams.get("workflowId");
        const secret = req.headers.get("X-Secret");

        if (!workflowId) {
            return NextResponse.json({ success: false, error: "Workflow ID is required" }, { status: 400 });
        }

        const node = await prisma.node.findFirst({
            where: {
                workflowId,
                type: NodeType.GOOGLE_SHEETS_TRIGGER,
            }
        });

        if (!node) {
            return NextResponse.json({ success: false, error: "Google Sheets Trigger not found" }, { status: 404 });
        }

        const data = (node.data as Record<string, any>) || {};
        const expectedSecret = data.secret;

        // Secrets are always required - no legacy fallback
        if (!expectedSecret) {
            return NextResponse.json({ success: false, error: "Unauthorized: Webhook secret not configured" }, { status: 401 });
        }

        if (!secret || !safeCompare(secret, expectedSecret)) {
            return NextResponse.json({ success: false, error: "Unauthorized: Invalid or missing secret" }, { status: 401 });
        }


        const body = await req.json();
        const sheetData = {
            spreadsheetId: body.spreadsheetId,
            spreadsheetName: body.spreadsheetName,
            spreadsheetUrl: body.spreadsheetUrl,
            sheetName: body.sheetName,
            range: body.range,
            changeType: body.changeType,
            changedRow: body.changedRow,
            changedColumn: body.changedColumn,
            changedColumnName: body.changedColumnName,
            oldValue: body.oldValue,
            newValue: body.newValue,
            changedBy: body.changedBy,
            timestamp: body.timestamp,
            rowData: body.rowData,
            totalRows: body.totalRows,
            allData: body.allData,
            allDataTruncated: body.allDataTruncated,
            raw: body,
        };

        await sendWorkflowExecution({
            workflowId,
            initialData: {
                googleSheets: sheetData,
            },
        });

        return NextResponse.json({ success: true, message: "Google Sheets trigger webhook processed successfully" }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ success: false, error: "Failed to process Google Sheets submission" }, { status: 500 });
    }
}
