class DependencyTreeEntry {
    entryPath: string;
    dependents: Array<DependencyTreeEntry> 

    constructor(entryPath: string) {
        this.entryPath = entryPath;
        this.dependents = new Array<DependencyTreeEntry>();
    }
}

interface BundleLabelData {
    requestedBundleID?: string,
    absPathToRequiredEntryPoint: string
}

class DependencyTree {
    private rootNode: DependencyTreeEntry;
    private nodeMap: Map<string, DependencyTreeEntry>;
    private entryPathToLabels: Map<string, Map<string, BundleLabelData>>;
    private buildOrderList: Array<string>

    constructor(entryPathToLabels: Map<string, Map<string, BundleLabelData>>) {
        this.rootNode = new DependencyTreeEntry("");
        this.nodeMap = new Map<string, DependencyTreeEntry>();
        this.entryPathToLabels = entryPathToLabels;
    }

    addNode(entryPath: string): void {
        let node = this.nodeMap.get(entryPath);
        // If this is not prent in map, add it;
        if(node == undefined) {
            node = new DependencyTreeEntry(entryPath);
            this.nodeMap.set(entryPath, node);
        }

        const labelMap = this.entryPathToLabels.get(entryPath);
        // If has no dependencies
        if(labelMap == undefined) {
            // Check if it's already there
            if(!this.rootNode.dependents.includes(node)) {
                // Add to root node
                this.rootNode.dependents.push(node);
            }
        } else {
            // For each dependency
            const labelIterator = labelMap.entries();
            for(let label = labelIterator.next(); !label.done; label = labelIterator.next()) {
                const dependency = label.value[1];
                let dependencyNode = this.nodeMap.get(dependency.absPathToRequiredEntryPoint);
                if(dependencyNode != undefined) {
                    // Get dependecy from map and add its path to it's dependants
                    // Check if it's already there 
                    if(!dependencyNode.dependents.includes(node)) {
                        dependencyNode.dependents.push(node);
                    }
                } else {
                    // If it's not there create a new node
                    this.addNode(dependency.absPathToRequiredEntryPoint);
                    // After making one, add to it's dependecies
                    dependencyNode = this.nodeMap.get(dependency.absPathToRequiredEntryPoint);
                    if(dependencyNode == undefined) {
                        throw new Error("Unexpected undefined while trying to get dependant nodes");
                    }

                    if(!dependencyNode.dependents.includes(node)) {
                        dependencyNode.dependents.push(node);
                    }
                }
            }
        }
    }

    getOrderedBuildOrderList(): Array<string> {
        this.buildOrderList = new Array<string>();
        this.addDependentsToBuildList(this.rootNode);
        return this.buildOrderList;
    }

    private addDependentsToBuildList(node: DependencyTreeEntry) {
        // No dependents, return
        if(node.dependents.length == 0) {
            return;
        }

        for(const dependent of node.dependents) {
            if(!this.buildOrderList.includes(dependent.entryPath)) {
                this.buildOrderList.push(dependent.entryPath);
            }
        }

        // Add all dependents and recurse throught them
        for(const dependent of node.dependents) {
            this.addDependentsToBuildList(dependent);
        }

    }
}

export {
    DependencyTree
}