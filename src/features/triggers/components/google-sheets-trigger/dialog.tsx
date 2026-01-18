"use client";

import { Button } from "@/components/ui/button";
import { 
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle 
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { generateGoogleSheetsScript } from "./utils";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const GoogleSheetsTriggerDialog = ({
    open,
    onOpenChange
}: Props) => {

    const params = useParams();
    const workflowId = params.workflowId as string;

    // Construct webhook url
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const webhookUrl = `${baseUrl}/api/webhooks/google-sheets?workflowId=${workflowId}`;

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(webhookUrl);
            toast.success("Webhook URL copied to clipboard")
        } catch (error) {
            toast.error("Failed to copy webhook URL to clipboard");
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange} >
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        Google Sheets Trigger Configuration
                    </DialogTitle>
                    <DialogDescription>
                        Use this webhook URL in your Google Sheet's Apps Script to trigger this workflow when the sheet is edited.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="webhook-url">
                            Webhook URL
                        </Label>
                        <div className="flex gap-2">
                            <Input 
                                id="webhook-url"
                                value={webhookUrl}
                                readOnly
                                className="font-mono text-sm"
                            />
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                onClick={copyToClipboard}
                            >
                                <CopyIcon className="size-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-lg bg-muted p-4 space-y-2">
                        <h4 className="font-medium text-sm">Setup Instructions</h4>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                            <li>Open your Google Sheet</li>
                            <li>Click Extensions → Apps Script</li>
                            <li>Delete any existing code and paste the script below</li>
                            <li>Save the project (Ctrl+S)</li>
                            <li>Click "Triggers" (clock icon) → Add Trigger</li>
                            <li>Choose: onEdit → From spreadsheet → On edit → Save</li>
                        </ol>
                    </div>

                    <div className="rounded-lg bg-muted p-4 space-y-3">
                        <h4 className="font-medium text-sm">Google Apps Script:</h4> 
                        <Button
                            type="button"
                            variant="outline"
                            onClick={async () => {
                                const script = generateGoogleSheetsScript(webhookUrl);
                                try {
                                    await navigator.clipboard.writeText(script);
                                    toast.success("Google Apps Script copied to clipboard");
                                } catch (error) {
                                    toast.error("Failed to copy Google Apps Script to clipboard");
                                }
                            }}
                        >
                            <CopyIcon className="size-4 mr-2" />
                            Copy Google Apps Script
                        </Button>
                        <p className="text-sm text-muted-foreground">
                            This script includes your webhook URL and handles sheet edits.
                        </p>
                    </div>

                    <div className="rounded-lg bg-muted p-4 space-y-2">
                        <h4 className="font-medium text-sm">Available Variables</h4>
                        <ul className="text-sm text-muted-foreground space-y-1.5">
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded text-xs">
                                    {"{{googleSheets.spreadsheetName}}"}
                                </code>
                                <span className="text-xs"> - Spreadsheet name</span>
                            </li>
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded text-xs">
                                    {"{{googleSheets.spreadsheetId}}"}
                                </code>
                                <span className="text-xs"> - Spreadsheet ID</span>
                            </li>
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded text-xs">
                                    {"{{googleSheets.spreadsheetUrl}}"}
                                </code>
                                <span className="text-xs"> - Link to open sheet</span>
                            </li>
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded text-xs">
                                    {"{{googleSheets.sheetName}}"}
                                </code>
                                <span className="text-xs"> - Tab/sheet name</span>
                            </li>
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded text-xs">
                                    {"{{googleSheets.changeType}}"}
                                </code>
                                <span className="text-xs"> - "edit" or "formSubmit"</span>
                            </li>
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded text-xs">
                                    {"{{googleSheets.newValue}}"}
                                </code>
                                <span className="text-xs"> - New cell value</span>
                            </li>
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded text-xs">
                                    {"{{googleSheets.oldValue}}"}
                                </code>
                                <span className="text-xs"> - Previous cell value</span>
                            </li>
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded text-xs">
                                    {"{{googleSheets.changedRow}}"}
                                </code>
                                <span className="text-xs"> - Row number</span>
                            </li>
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded text-xs">
                                    {"{{googleSheets.timestamp}}"}
                                </code>
                                <span className="text-xs"> - When changed</span>
                            </li>
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded text-xs">
                                    {"{{json googleSheets.rowData}}"}
                                </code>
                                <span className="text-xs"> - Changed row as JSON</span>
                            </li>
                            <li className="pt-1 border-t border-border/50">
                                <code className="bg-background px-1 py-0.5 rounded text-xs font-bold">
                                    {"{{json googleSheets.allData}}"}
                                </code>
                                <span className="text-xs font-medium"> - All sheet data (for summarization)</span>
                            </li>
                        </ul>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    )
};
