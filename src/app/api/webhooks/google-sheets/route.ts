import { sendWorkflowExecution } from "@/inngest/utils";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const workflowId = url.searchParams.get("workflowId");
        if (!workflowId) {
            return NextResponse.json({ success: false, error: "Workflow ID is required" }, { status: 400 });
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
