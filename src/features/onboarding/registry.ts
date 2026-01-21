/**
 * Onboarding Feature Registry
 * 
 * Central configuration for all onboarding tours.
 * Each feature defines its steps, dependencies, and optional dynamic blockers.
 */

import type { OnboardingFeature, FeatureRegistry, OnboardingStep } from './types';

const sidebarSteps: OnboardingStep[] = [
    {
        id: 'sidebar-welcome',
        feature: 'sidebar',
        target: '[data-onboarding="sidebar-container"]',
        title: 'Welcome to Nodebase',
        description: 'This is your navigation hub. Let\'s take a quick tour of the main sections.',
        placement: 'right',
    },
    {
        id: 'sidebar-workflows',
        feature: 'sidebar',
        target: '[data-onboarding="nav-workflows"]',
        title: 'Workflows',
        description: 'Create and manage your automation workflows here.',
        placement: 'right',
    },
    {
        id: 'sidebar-credentials',
        feature: 'sidebar',
        target: '[data-onboarding="nav-credentials"]',
        title: 'Credentials',
        description: 'Store your API keys and connection details securely.',
        placement: 'right',
    },
    {
        id: 'sidebar-executions',
        feature: 'sidebar',
        target: '[data-onboarding="nav-executions"]',
        title: 'Executions',
        description: 'Monitor your workflow runs and view execution history.',
        placement: 'right',
    },
];

const credentialsSteps: OnboardingStep[] = [
    {
        id: 'credentials-header',
        feature: 'credentials',
        target: '[data-onboarding="credentials-container"]',
        title: 'Credentials Management',
        description: 'Here you can add and manage your API keys for different services.',
        placement: 'target-center',
    },
    {
        id: 'credentials-new-button',
        feature: 'credentials',
        target: '[data-onboarding="credentials-new-button"]',
        title: 'Add Your First Credential',
        description: 'Click here to add a new API key. You\'ll need at least one to use AI nodes.',
        placement: 'bottom',
    },
];

const workflowsSteps: OnboardingStep[] = [
    {
        id: 'workflows-header',
        feature: 'workflows',
        target: '[data-onboarding="workflows-container"]',
        title: 'Workflows',
        description: 'Create and manage your automation workflows here.',
        placement: 'target-center',
    },
    {
        id: 'workflows-new-button',
        feature: 'workflows',
        target: '[data-onboarding="workflows-new-button"]',
        title: 'Create Your First Workflow',
        description: 'Click here to start building a new automation workflow.',
        placement: 'bottom',
        requireAction: true,
        actionLabel: 'Click +',
    },
];

const executionsSteps: OnboardingStep[] = [
    {
        id: 'executions-header',
        feature: 'executions',
        target: '[data-onboarding="executions-container"]',
        title: 'Executions',
        description: 'View the history and status of your workflow runs here.',
        placement: 'target-center',
        actionLabel: 'Done'
    },
];

const workflowEditorSteps: OnboardingStep[] = [
    {
        id: 'intro',
        feature: 'workflow-editor',
        target: '[data-onboarding="initial-node"]',
        title: "Let's Build Your First Workflow",
        description: "We'll build a simple HTTP request workflow to get you started.",
        placement: 'center',
        actionLabel: 'Start Tour',
        showSpotlight: false,
    },
    {
        id: 'initial-node-click',
        feature: 'workflow-editor',
        target: '[data-onboarding="initial-node"]',
        title: 'Start Your Workflow',
        description: 'Click the start node to begin building your automation.',
        placement: 'right',
        requireAction: true,
        actionLabel: 'Click Start',
    },
    {
        id: 'select-manual-trigger',
        feature: 'workflow-editor',
        target: '#node-item-MANUAL_TRIGGER',
        title: 'Add a Trigger',
        description: 'Select "Trigger manually" to start your workflow with a click.',
        placement: 'left',
        requireAction: true,
        actionLabel: 'Select Trigger',
    },
    {
        id: 'add-node-click',
        feature: 'workflow-editor',
        target: '[data-onboarding="add-node-button"]',
        title: 'Add an Action',
        description: 'Now, click the plus button to add an action to perform.',
        placement: 'left',
        requireAction: true,
        actionLabel: 'Click +',
    },
    {
        id: 'select-http',
        feature: 'workflow-editor',
        target: '#node-item-HTTP_REQUEST',
        title: 'Choose HTTP Request',
        description: 'Select "HTTP Request" from the list to make an API call.',
        placement: 'left',
        requireAction: true,
        actionLabel: 'Select Node',
    },
    {
        id: 'connect-nodes',
        feature: 'workflow-editor',
        target: '[data-onboarding="manual-trigger-node-source-handle"]',
        title: 'Connect the Nodes',
        description: 'Drag a line from this handle to the input handle of the new HTTP Request node. You can hold and drag the node to change its position.',
        placement: 'right',
    },
    {
        id: 'select-node',
        feature: 'workflow-editor',
        target: '[data-onboarding="http-request-node"]',
        title: 'Select Node',
        description: 'Click the HTTP Request node to reveal the toolbar options. Click the gear icon to configure the node.',
        placement: 'bottom',
        requireAction: true,
        actionLabel: 'Select Node',
    },
    {
        id: 'click-settings',
        feature: 'workflow-editor',
        target: '[data-onboarding="node-settings-trigger"]',
        title: 'Open Settings',
        description: 'Click the settings (gear) icon above the node.',
        placement: 'top',
        requireAction: true,
        actionLabel: 'Click Gear',
    },
    {
        id: 'edit-settings',
        feature: 'workflow-editor',
        target: '[data-onboarding="node-settings-dialog"]',
        title: 'Configure & Save',
        description: 'Set the variable name to "myApiCall" or any name you want. Configure any method or URL you want to use. When you are done, click the Save button inside the dialog.',
        placement: 'right',
    },
    {
        id: 'rename-workflow',
        feature: 'workflow-editor',
        target: '[data-onboarding="workflow-name"]',
        title: 'Rename Workflow',
        description: 'Click the workflow name to rename it. Press Enter to save, then click Next.',
        placement: 'bottom',
    },
    {
        id: 'save-workflow',
        feature: 'workflow-editor',
        target: '#save-workflow-button',
        title: 'Save Your Work',
        description: 'Always remember to save your changes before running the workflow.',
        placement: 'bottom',
        requireAction: true,
        actionLabel: 'Click Save',
    },
    {
        id: 'execute-workflow',
        feature: 'workflow-editor',
        target: '#execute-workflow-button',
        title: 'Run Workflow',
        description: 'Click the "Execute Workflow" button to trigger your automation manually.',
        placement: 'top',
        requireAction: true,
        actionLabel: 'Click Execute',
    },
    {
        id: 'view-executions',
        feature: 'workflow-editor',
        target: '#view-executions-tab',
        title: 'View Results',
        description: 'Wait a few seconds for the execution to complete, then switch to the Executions tab to see the logs.',
        placement: 'bottom',
        requireAction: true,
        actionLabel: 'Click Tab',
    },
    {
        id: 'inspect-execution',
        feature: 'workflow-editor',
        target: '[data-onboarding="first-execution-row"]',
        title: 'Check Results',
        description: 'Click the execution to view full details and output logs.',
        placement: 'top',
        requireAction: true,
        actionLabel: 'View Details',
    },
];

export const FEATURE_REGISTRY: FeatureRegistry = {
    sidebar: {
        id: 'sidebar',
        name: 'Sidebar Navigation',
        dependencies: [],
        steps: sidebarSteps,
    },
    workflows: {
        id: 'workflows',
        name: 'Workflows Tour',
        dependencies: ['sidebar'],
        steps: workflowsSteps,
        route: '/workflows',
    },
    'workflow-editor': {
        id: 'workflow-editor',
        name: 'Editor Tour',
        dependencies: ['workflows'],
        steps: workflowEditorSteps,
        route: '/workflows/*',
    },
    credentials: {
        id: 'credentials',
        name: 'Credentials Tour',
        dependencies: ['sidebar'],
        steps: credentialsSteps,
        route: '/credentials',
    },
    executions: {
        id: 'executions',
        name: 'Executions Tour',
        dependencies: ['sidebar'],
        steps: executionsSteps,
        route: '/executions',
    },
};

/**
 * Get a feature by ID
 */
export function getFeature(featureId: string): OnboardingFeature | undefined {
    return FEATURE_REGISTRY[featureId];
}

/**
 * Get a step by ID within a feature
 */
export function getStep(featureId: string, stepId: string): OnboardingStep | undefined {
    const feature = FEATURE_REGISTRY[featureId];
    return feature?.steps.find(s => s.id === stepId);
}

/**
 * Get step index by ID
 */
export function getStepIndex(featureId: string, stepId: string): number {
    const feature = FEATURE_REGISTRY[featureId];
    return feature?.steps.findIndex(s => s.id === stepId) ?? -1;
}

/**
 * Get all feature IDs in dependency order (topological sort)
 */
export function getFeatureOrder(): string[] {
    // Simple order since our DAG is linear
    return ['sidebar', 'workflows', 'workflow-editor', 'credentials', 'executions'];
}

/**
 * Check if all dependencies for a feature are completed
 */
export function areDependenciesMet(
    featureId: string,
    completedFeatures: string[]
): boolean {
    const feature = FEATURE_REGISTRY[featureId];
    if (!feature) return false;
    return feature.dependencies.every(dep => completedFeatures.includes(dep));
}

/**
 * Get the first feature that hasn't been completed or skipped
 */
export function getNextIncompleteFeature(
    completedFeatures: string[],
    skippedFeatures: string[]
): string | null {
    const order = getFeatureOrder();
    const doneFeatures = new Set([...completedFeatures, ...skippedFeatures]);

    for (const featureId of order) {
        if (!doneFeatures.has(featureId) && areDependenciesMet(featureId, completedFeatures)) {
            return featureId;
        }
    }

    return null;
}
