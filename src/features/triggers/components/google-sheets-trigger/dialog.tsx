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
import { useState } from "react";
import { toast } from "sonner";
import { generateGoogleSheetsScript } from "./utils";
import { Checkbox } from "@/components/ui/checkbox";

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

    // Trigger filter options
    const [includeFullData, setIncludeFullData] = useState(false);
    const [sheetName, setSheetName] = useState("");
    const [triggerValue, setTriggerValue] = useState("");
    const [debounceSeconds, setDebounceSeconds] = useState(0);

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

    const copyCustomScript = async () => {
        const script = generateGoogleSheetsScript(webhookUrl, {
            includeFullData,
            maxRows: 1000,
            sheetName: sheetName.trim(),
            triggerValue: triggerValue.trim(),
            debounceSeconds,
        });
        try {
            await navigator.clipboard.writeText(script);
            toast.success("Custom script copied to clipboard");
        } catch (error) {
            toast.error("Failed to copy script");
        }
    };

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

                    <div className="rounded-lg bg-muted p-4 space-y-4 border border-primary/20">
                        <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">Custom Script</h4>
                            <span className="px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full">
                                Recommended
                            </span>
                        </div>
                        
                        {/* Trigger Filters */}
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="sheetName" className="text-xs">
                                        Sheet Name (optional)
                                    </Label>
                                    <Input
                                        id="sheetName"
                                        value={sheetName}
                                        onChange={(e) => setSheetName(e.target.value)}
                                        placeholder="e.g. Orders"
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="triggerValue" className="text-xs">
                                        Trigger Value (optional)
                                    </Label>
                                    <Input
                                        id="triggerValue"
                                        value={triggerValue}
                                        onChange={(e) => setTriggerValue(e.target.value)}
                                        placeholder="e.g. Complete"
                                        className="h-8 text-sm"
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="debounce" className="text-xs">
                                        Debounce (seconds)
                                    </Label>
                                    <Input
                                        id="debounce"
                                        type="number"
                                        min={0}
                                        value={debounceSeconds}
                                        onChange={(e) => setDebounceSeconds(Number(e.target.value))}
                                        placeholder="0"
                                        className="h-8 text-sm"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-center space-x-2 pt-2">
                                <Checkbox
                                    id="includeFullData"
                                    checked={includeFullData}
                                    onCheckedChange={(checked) => setIncludeFullData(!!checked)}
                                />
                                <Label htmlFor="includeFullData" className="text-xs">
                                    Include all sheet data (max 1000 rows) for summarization
                                </Label>
                            </div>
                        </div>
                        
                        <Button
                            type="button"
                            onClick={copyCustomScript}
                            className="w-full"
                        >
                            <CopyIcon className="size-4 mr-2" />
                            Copy Custom Script
                        </Button>
                        
                        <p className="text-xs text-muted-foreground">
                            <strong>Sheet:</strong> Only trigger on this specific sheet/tab.<br/>
                            <strong>Value:</strong> Only trigger when any cell changes to this value.<br/>
                            <strong>Debounce:</strong> Minimum seconds between triggers.
                        </p>
                    </div>

                    <div className="rounded-lg bg-muted p-4 space-y-3">
                        <h4 className="font-medium text-sm text-muted-foreground">Quick Presets</h4>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                    const script = generateGoogleSheetsScript(webhookUrl);
                                    try {
                                        await navigator.clipboard.writeText(script);
                                        toast.success("Basic script copied (triggers on any change)");
                                    } catch (error) {
                                        toast.error("Failed to copy script");
                                    }
                                }}
                            >
                                <CopyIcon className="size-3 mr-1" />
                                Basic
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                    const script = generateGoogleSheetsScript(webhookUrl, { 
                                        includeFullData: true, 
                                        maxRows: 1000 
                                    });
                                    try {
                                        await navigator.clipboard.writeText(script);
                                        toast.success("Full data script copied (max 1000 rows)");
                                    } catch (error) {
                                        toast.error("Failed to copy script");
                                    }
                                }}
                            >
                                <CopyIcon className="size-3 mr-1" />
                                With All Data
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            <strong>Basic:</strong> Triggers on any change, sends row data only.<br/>
                            <strong>With All Data:</strong> Basic but includes full sheet (1000 rows) for summarization.
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
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded text-xs">
                                    {"{{googleSheets.totalRows}}"}
                                </code>
                                <span className="text-xs"> - Total rows in sheet</span>
                            </li>
                            <li className="pt-1 border-t border-border/50">
                                <code className="bg-background px-1 py-0.5 rounded text-xs font-bold">
                                    {"{{json googleSheets.allData}}"}
                                </code>
                                <span className="text-xs font-medium"> - All sheet data (requires "With All Data" script)</span>
                            </li>
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded text-xs">
                                    {"{{googleSheets.allDataTruncated}}"}
                                </code>
                                <span className="text-xs"> - True if data was capped at 1000 rows</span>
                            </li>
                        </ul>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    )
};
