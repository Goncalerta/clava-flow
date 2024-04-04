import ControlFlowEdge from "clava-flow/flow/edge/ControlFlowEdge";
import InstructionNode from "clava-flow/flow/node/instruction/InstructionNode";
import BaseEdge from "clava-flow/graph/BaseEdge";
import BaseNode from "clava-flow/graph/BaseNode";
import { NodeBuilder, NodeConstructor, NodeTypeGuard } from "clava-flow/graph/Node";
import { Joinpoint } from "clava-js/api/Joinpoints.js";

namespace FlowNode {
    export class Class<
        D extends Data = Data,
        S extends ScratchData = ScratchData,
    > extends BaseNode.Class<D, S> {
        insertBefore(node: InstructionNode.Class) {
            this.insertSubgraphBefore(node, [node]);
        }

        insertSubgraphBefore(head: BaseNode.Class, tail: InstructionNode.Class[]) {
            this.incomers.forEach((edge) => {
                edge.target = head;
            });

            for (const tailNode of tail) {
                tailNode.nextNode = this;
            }
        }
        
        removeFromFlow() {
            // TODO improve ergonomics with Collection class
            const incomers = this.incomers
                .filter((edge) => edge.is(ControlFlowEdge.TypeGuard));
            
            const outgoers = this.outgoers
                .filter((edge) => edge.is(ControlFlowEdge.TypeGuard));
            
            if (incomers.length === 0 || outgoers.length === 0) {
                for (const edge of incomers) {
                    edge.remove();
                }
                for (const edge of outgoers) {
                    edge.remove();
                }
            } else if (outgoers.length === 1) {
                for (const edge of incomers) {
                    edge.target = outgoers[0].target;
                }

                outgoers[0].remove();
            } else {
                throw new Error("Cannot remove node with at least one incomer and multiple outgoers.");
            }
        }

        get jp(): Joinpoint | undefined {
            return this.scratchData.$jp;
        }
    }

    export abstract class Builder
        extends BaseNode.Builder
        implements NodeBuilder<Data, ScratchData>
    {
        #$jp: Joinpoint | undefined;
        #flowNodeType: Type;

        constructor(type: Type, $jp: Joinpoint | undefined) {
            super();
            this.#$jp = $jp;
            this.#flowNodeType = type;
        }

        override buildData(data: BaseNode.Data): Data {
            return {
                ...super.buildData(data),
                flowNodeType: this.#flowNodeType,
            };
        }

        override buildScratchData(scratchData: BaseNode.ScratchData): ScratchData {
            return {
                ...super.buildScratchData(scratchData),
                $jp: this.#$jp,
            };
        }
    }

    export const TypeGuard: NodeTypeGuard<Data, ScratchData> = {
        isDataCompatible(data: BaseNode.Data): data is Data {
            if (!BaseNode.TypeGuard.isDataCompatible(data)) return false;
            const d = data as Data;
            if (!Object.values(Type).includes(d.flowNodeType as Type)) return false;
            return true;
        },

        isScratchDataCompatible(
            scratchData: BaseNode.ScratchData,
        ): scratchData is ScratchData {
            if (!BaseNode.TypeGuard.isScratchDataCompatible(scratchData)) return false;
            const s = scratchData as ScratchData;
            if (s.$jp !== undefined && !(s.$jp instanceof Joinpoint)) return false;
            return true;
        },
    };

    export interface Data extends BaseNode.Data {
        flowNodeType: Type;
    }

    export interface ScratchData extends BaseNode.ScratchData {
        $jp: Joinpoint | undefined;
    }

    // ------------------------------------------------------------

    export enum Type {
        INSTRUCTION = "instruction",
        CONDITION = "condition",
    }
}

export default FlowNode;
