import { Connection, Node } from "@/generated/prisma";
import toposort from "toposort";

export const topologicalSort = (
    nodes: Node[],
    connections: Connection[]
): Node[] => {
    // if no connections, return nodes as is
    if(connections.length === 0) return nodes;

    // create edges aray for toposort
    const edges: [string, string][] = connections.map((connection) => [
        connection.fromNodeId,
        connection.toNodeId,
    ]);

    //  add nodes with no connections as self-edges to ensure they are included
    const connectedNodeIds = new Set<String>();
    for(const conn of connections) {
        connectedNodeIds.add(conn.fromNodeId);
        connectedNodeIds.add(conn.toNodeId);
    }

    for(const node of nodes) {
        if(!connectedNodeIds.has(node.id)) {
            edges.push([node.id, node.id]);
        }
    }

    let sortedNodeIds: string[];

    try {
        sortedNodeIds = toposort(edges);
        // remove duplicates
        sortedNodeIds = [...new Set(sortedNodeIds)];
    } catch (error) {
        if(error instanceof Error && error.message.includes("Cyclic")) {
            throw new Error("Workflow contains a cycle!");
        }
        throw error;
    }

    // map sorted ids back to node objects
    const nodeMap = new Map(nodes.map((n)=> [n.id, n]));
    return sortedNodeIds.map((id)=> nodeMap.get(id)!).filter(Boolean);
};