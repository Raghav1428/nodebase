"use client";

import { 
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle 
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Get all IANA timezone names (guarded for older runtimes)
const ALL_TIMEZONES: string[] = (() => {
    try {
        if (typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function") {
            return Intl.supportedValuesOf("timeZone");
        }
    } catch { /* unsupported */ }
    return ["UTC"];
})();

// Detect the user's browser timezone (guarded)
const BROWSER_TIMEZONE: string = (() => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
        return "UTC";
    }
})();

const formSchema = z.object({
    cronExpression: z
        .string()
        .min(1, "Cron expression is required")
        .regex(/^(\S+\s+){4}\S+$/, { message: "Cron expression must have 5 parts (e.g., '0 9 * * 1' for every Monday at 9am)" }),
    timezone: z
        .string()
        .min(1, "Timezone is required"),
});

export type ScheduledTriggerFormValues = z.infer<typeof formSchema>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: ScheduledTriggerFormValues) => void;
    defaultValues?: Partial<ScheduledTriggerFormValues>;
}

export const ScheduledTriggerDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues = {},
}: Props) => {

    const [tzPopoverOpen, setTzPopoverOpen] = useState(false);

    const form = useForm<ScheduledTriggerFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            cronExpression: defaultValues.cronExpression || '',
            timezone: defaultValues.timezone || "UTC",
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                cronExpression: defaultValues.cronExpression || "",
                timezone: defaultValues.timezone || "UTC",
            });
        }
    }, [open, defaultValues, form]);

    const handleSubmit = (values: ScheduledTriggerFormValues) => {
        onSubmit(values);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange} >
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        Scheduled Trigger Configuration
                    </DialogTitle>
                    <DialogDescription>
                        Configure the <strong>schedule</strong> for when this workflow should run.
                        <span className="block mt-2 text-sm text-primary dark:text-primary">
                            <strong>Note:</strong> The scheduler checks every 10 minutes. Your workflow will run at the nearest 10-minute interval after your scheduled time.
                        </span>
                    </DialogDescription>
                </DialogHeader>
                
                {/* Disable scheduler alert */}
                {/* <Alert variant="destructive" className="mt-4">
                    <AlertTriangleIcon className="h-4 w-4" />
                    <AlertTitle>Scheduler Configured but Disabled</AlertTitle>
                    <AlertDescription className="mt-2">
                        The background scheduler is temporarily disabled to conserve resources. Your scheduled workflows will not run automatically during this time.
                    </AlertDescription>
                </Alert> */}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
                        <FormField 
                            control={form.control}
                            name="cronExpression"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cron Expression</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="0 9 * * 1" 
                                            {...field}
                                            className="font-mono"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        <Collapsible>
                                            <CollapsibleTrigger className="cursor-pointer text-xs font-medium text-muted-foreground">
                                                How to write cron expressions (click to expand)
                                            </CollapsibleTrigger>

                                            <CollapsibleContent className="mt-2 space-y-2 text-xs sm:text-sm">
                                                <p><strong>Format:</strong> minute hour day month weekday</p>
                                                
                                                <div className="rounded-lg bg-muted p-3 space-y-2">
                                                    <p className="font-medium">Common Examples:</p>
                                                    <ul className="list-disc ml-6 space-y-1">
                                                        <li><code className="bg-background px-1 py-0.5 rounded">0 9 * * 1</code> - Every Monday at 9:00 AM</li>
                                                        <li><code className="bg-background px-1 py-0.5 rounded">0 0 * * *</code> - Every day at midnight</li>
                                                        <li><code className="bg-background px-1 py-0.5 rounded">0 */6 * * *</code> - Every 6 hours</li>
                                                        <li><code className="bg-background px-1 py-0.5 rounded">0 9 1 * *</code> - First day of every month at 9:00 AM</li>
                                                        <li><code className="bg-background px-1 py-0.5 rounded">30 14 * * 1-5</code> - Weekdays at 2:30 PM</li>
                                                    </ul>
                                                </div>

                                                <div className="rounded-lg bg-muted p-3 space-y-2">
                                                    <p className="font-medium">Special Characters:</p>
                                                    <ul className="list-disc ml-6 space-y-1">
                                                        <li><code className="bg-background px-1 py-0.5 rounded">*</code> - Any value</li>
                                                        <li><code className="bg-background px-1 py-0.5 rounded">,</code> - Value list separator (e.g., 1,3,5)</li>
                                                        <li><code className="bg-background px-1 py-0.5 rounded">-</code> - Range of values (e.g., 1-5)</li>
                                                        <li><code className="bg-background px-1 py-0.5 rounded">/</code> - Step values (e.g., */2 = every 2)</li>
                                                    </ul>
                                                </div>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="timezone"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Timezone</FormLabel>
                                    <Button
                                                    type="button"
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={tzPopoverOpen}
                                                    onClick={() => setTzPopoverOpen(!tzPopoverOpen)}
                                                    className={cn(
                                                        "w-full justify-between font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value || "Select timezone..."}
                                                    <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                                {tzPopoverOpen && (
                                                    <div className="rounded-md border shadow-md">
                                                        <Command>
                                                            <CommandInput placeholder="Search timezone..." />
                                                            <CommandList className="max-h-[200px]">
                                                                <CommandEmpty>No timezone found.</CommandEmpty>
                                                                <CommandGroup>
                                                                    {ALL_TIMEZONES.map((tz) => (
                                                                        <CommandItem
                                                                            key={tz}
                                                                            value={tz}
                                                                            onSelect={() => {
                                                                                field.onChange(tz);
                                                                                setTzPopoverOpen(false);
                                                                            }}
                                                                        >
                                                                            <CheckIcon
                                                                                className={cn(
                                                                                    "mr-2 h-4 w-4",
                                                                                    field.value === tz ? "opacity-100" : "opacity-0"
                                                                                )}
                                                                            />
                                                                            {tz.replace(/_/g, " ")}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </div>
                                                )}
                                    <FormDescription>
                                        The cron expression will be interpreted in this timezone.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <DialogFooter className="mt-4">
                            <Button type="submit">Save</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
};