import { InititalNode } from "@/components/initial-node";
import { NodeType } from "@/generated/prisma";
import { NodeTypes } from "@xyflow/react";

export const nodeComponents = {
    [NodeType.INITIAL]: InititalNode,
} as const  satisfies NodeTypes;

export type RegisteredType = keyof typeof nodeComponents;