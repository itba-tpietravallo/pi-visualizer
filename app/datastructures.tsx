const Context: { ctx: CanvasRenderingContext2D | null, offsetX: number, offsetY: number, Render: () => void, } = {
    ctx: null,
    offsetX: 0,
    offsetY: 0,
    Render: () => {},
};

let intervalMS = 0;
export const setIntervalMS = (ms: number) => intervalMS = ms;

export function setContext(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number, render: () => void) {
    Context.ctx = ctx;
    Context.offsetX = offsetX;
    Context.offsetY = offsetY;
    Context.Render = render;
}

export abstract class DrawableElement {
    public x: number = 0;
    public y: number = 0;
    protected size: number = 0;
    protected color: string = '';
    protected highlight: boolean = false;

    abstract draw(): DrawableElement;

    setDefaultDrawAttributes() {
        this.setPos(0, 0);
        this.setSize(75);
        this.setColor('rgb(0, 0, 0)');
        return this;
    }

    setPos(x: number, y: number) {
        this.x = x;
        this.y = y;
        return this;
    }

    setSize(size: number) {
        this.size = size;
        return this;
    }

    setColor(color: string) {
        this.color = color;
        return this;
    }

    setHightlight(bool: boolean) {
        this.highlight = bool;
        this.draw();
        return this;
    }
}

export abstract class Structure extends DrawableElement {
    protected display: Display = Display.HORIZONTAL;
    protected performActionInPlace: boolean = false;

    abstract insert(...vals: any[]): Generator<Node, Node>;
    /**
     * Note: This method shall YIELD the node that is being removed, instead of returning it, and returns null.
     * This is to allow wrapGenerator to highlight the node being removed.
     */
    abstract remove(...vals: any[]): Generator<Node, Node | null>;
    abstract search(...vals: any[]): Generator<Node, Node | null>;
    abstract getActions(): { name: string, action: (...vals: any[]) => void }[];
    abstract applyToElements(fn : (elem: DrawableElement) => void): void;

    setDisplay(display: Display): Structure {
        this.display = display;
        return this;
    }

    setPerformActionInPlace(performActionInPlace: boolean): Structure {
        this.performActionInPlace = performActionInPlace;
        return this;
    }
}

export enum StructureType {
    LIST = 'Linked List',
    QUEUE = 'Queue',
    STACK = 'Stack',
    VECTOR = 'Vector',
    EMPTY = '---'
}

export enum Display {
    HORIZONTAL = 'Horizontal',
    VERTICAL = 'Vertical'
}

export enum NodeType {
    RECTANGULAR = 'Rectangular',
    CIRCULAR = 'Circular'
}

export class Node extends DrawableElement {
    public type: NodeType = NodeType.CIRCULAR;

    constructor(public key: any, public value: any, public next: Node | null = null) {
        super();
    }

    toString() {
        const t = (typeof this.value == "string" || typeof this.value == 'number') ? this.value.toString() : this.key.toString()
        return t;
    }

    equals(other: Node) {
        return this.key === other.key;
    }

    setType(type: NodeType) {
        this.type = type;
        return this;
    }

    draw() {
        if (!Context.ctx) return this;

        Context.ctx.fillStyle = this.color || 'rgb(255, 0, 255)';
        Context.ctx.strokeStyle = this.highlight ? 'rgb(255,0,0)' : Context.ctx.fillStyle;
        Context.ctx.lineWidth = 3;

        if (this.type === NodeType.CIRCULAR) {
            Context.ctx.beginPath();
            Context.ctx.arc(this.x + this.size / 2 + Context.offsetX, this.y + this.size / 2 + Context.offsetY, this.size / 2, 0, 2 * Math.PI);
            Context.ctx.fill();
            Context.ctx.stroke();
        } else if (this.type === NodeType.RECTANGULAR) {
            Context.ctx.fillRect(this.x + Context.offsetX, this.y + Context.offsetY, this.size, this.size);
            Context.ctx.strokeRect(this.x + Context.offsetX, this.y + Context.offsetY, this.size, this.size);
        }

        Context.ctx.fillStyle = 'rgb(255, 255, 255)';
        Context.ctx.textAlign = 'center';
        Context.ctx.textBaseline = 'middle';
        Context.ctx.font = '20px Arial';
        Context.ctx.fillText(this.toString(), this.x + this.size / 2 + Context.offsetX, this.y + this.size / 2 + Context.offsetY);
        return this;
    }

    drawPointerToNext() {
        if (this.next && Context.ctx) {
            Context.ctx.strokeStyle = 'rgb(0, 0, 0)';
            const diffX = this.next.x - this.x;
            const diffY = this.next.y - this.y;
            
            if (Math.abs(diffX) < 0.001) {
                if (diffY > 0) {
                    canvasArrow(Context.ctx, this.x + this.size / 2 + Context.offsetX, this.y + this.size + Context.offsetY, this.next.x + this.next.size / 2 + Context.offsetX, this.next.y + Context.offsetY);
                } else {
                    canvasArrow(Context.ctx, this.x + this.size / 2 + Context.offsetX, this.y + Context.offsetY, this.next.x + this.next.size / 2 + Context.offsetX, this.next.y + this.next.size + Context.offsetY);
                }
            } else {
                if (diffX > 0) {
                    canvasArrow(Context.ctx, this.x + this.size + Context.offsetX, this.y + this.size / 2 + Context.offsetY, this.next.x + Context.offsetX, this.next.y + this.next.size / 2 + Context.offsetY);
                } else {
                    canvasArrow(Context.ctx, this.x + Context.offsetX, this.y + this.size / 2 + Context.offsetY, this.next.x + this.next.size + Context.offsetX, this.next.y + this.next.size / 2 + Context.offsetY);
                }
            }
        }
    }
}

export class List extends Structure {
    public type: StructureType = StructureType.LIST;
    public nodeType: NodeType = NodeType.CIRCULAR;

    head: Node | null = null;

    constructor() {
        super();
    }

    static ofLength(length: number) {
        const list = new List();
        for (let i = 0; i < length; i++) {
            exhaustGenerator(list.insert(i));
        }
        return list;
    }

    draw() {
        let current = this.head;
        this.setPos(this.x, this.y);
        this.setSize(this.size);
        this.setColor(this.color);
        while (current) {
            current.draw();
            current.drawPointerToNext();
            current = current.next;
        }
        return this;
    }

    setPos(x: number, y: number) {
        super.setPos(x, y);
        let current = this.head;
        while (current) {
            current.setPos(x, y);

            if (this.display === Display.HORIZONTAL) {
                x += this.size * 1.5;
            } else {
                y += this.size * 1.5;
            }

            current = current.next;
        }
        return this;
    }

    setColor(color: string) {
        super.setColor(color);
        this.applyToElements((elem) => elem.setColor(color));
        return this;
    }

    setSize(size: number) {
        super.setSize(size);
        this.applyToElements((elem) => elem.setSize(size));
        return this;
    }

    setNodeType(type: NodeType) {
        this.nodeType = type;
        this.applyToElements(elem => elem.setType(type));
        return this;
    }

    * insert(data: any, value: any = null) {
        if (this.head === null) {
            this.head = new Node(data, value, null);
            return this.head;
        }

        if (data < this.head.key) {
            this.head = new Node(data, value, this.head);
            return this.head;
        }

        let current = this.head;
        yield current;

        while (current.next && data > current.next.key) {
            current = current.next;
            yield current;
        }

        current.next = new Node(data, value, current.next);
        return current.next;
    }

    * remove(key: any) {
        if (this.head === null) return null;

        if (this.head.key === key) {
            let aux = this.head;
            yield aux;
            this.head = this.head.next;
            return null;
        }

        let current = this.head;
        yield current;
        while (current.next && current.next.key <= key) {
            if (current.next.key == key) {
                let aux = current.next;
                yield aux ;
                current.next = current.next.next;
                return null;
            }
            current = current.next;
            yield current;
        }

        return null;
    }

    * search(key: any) {
        let current = this.head;
        while (current) {
            if (current.key < key) {
                yield current;
            }
            if (current.key == key) {
                return current;
            }
            current = current.next;
        }
        return null;
    }

    getActions() {
        return [
            {
                name: 'Insert',
                action: (data: any) => wrapGenerator(this.insert(data))
            },
            {
                name: 'Remove',
                action: (data: any) => wrapGenerator(this.remove(data))
            },
            {
                name: 'Search',
                action: (data: any) => wrapGenerator(this.search(data))
            }
        ];
    }

    applyToElements(fn: (elem: Node) => void) {
        let current = this.head;
        while (current) {
            fn(current);
            current = current.next;
        }
    }

    setHightlight(bool: boolean) {
        this.applyToElements((elem) => elem.setHightlight(bool));
        return this;
    }
}

export class Queue extends List {
    public readonly type: StructureType = StructureType.QUEUE;
    last: Node | null = null;

    constructor() {
        super();
    }

    static ofLength(length: number): Queue {
        const queue = new Queue();
        for (let i = 0; i < length; i++) {
            exhaustGenerator(queue.insert(i));
        }
        return queue;
    }

    * insert (data: any, value: any = null) {
        if (this.head === null || this.last == null) {
            this.head = this.last = new Node(data, value, null);
            return this.head;
        }

        yield this.last;
        this.last.next = new Node(data, value, null);
        this.last = this.last.next;
        return this.last;
    }

    * remove() {
        if (this.head === null) return null;
        const aux = this.head;
        yield this.head;
        this.head = this.head.next;

        if (!this.performActionInPlace) {
            if (this.display === Display.HORIZONTAL) {
                this.x += this.size * 1.5;
            } else {
                this.y += this.size * 1.5;
            }
        }
            
        return null;
    }

    getActions(): { name: string; action: (data: any) => void; }[] {
        return [
            {
                name: 'Insert (last)',
                action: (data: any) => wrapGenerator(this.insert(data))
            },
            {
                name: 'Remove (first)',
                action: (data: any) => wrapGenerator(this.remove())
            },
            {
                name: 'Search',
                action: (data: any) => wrapGenerator(this.search(data))
            }
        ];
    }
}

export class Stack extends List {
    public readonly type: StructureType = StructureType.STACK;

    constructor() {
        super();
    }

    static ofLength(length: number): Stack {
        const stack = new Stack();
        for (let i = 0; i < length; i++) {
            exhaustGenerator(stack.insert(i));
        }
        return stack
    }

    * insert(data: any, value: any = null) {
        if (this.head) yield this.head;
        this.head = new Node(data, value, this.head);

        if (!this.performActionInPlace) {
            if (this.display === Display.HORIZONTAL) {
                this.x -= this.size * 1.5;
            } else {
                this.y -= this.size * 1.5;
            }
        }

        return this.head;
    }

    * remove() {
        if (this.head === null) return null;
        yield this.head;
        this.head = this.head.next;

        if (!this.performActionInPlace) {
            if (this.display === Display.HORIZONTAL) {
                this.x += this.size * 1.5;
            } else {
                this.y += this.size * 1.5;
            }
        }

        return null;
    }

    getActions(): { name: string; action: (data: any) => void; }[] {
        return [
            {
                name: 'Insert (first)',
                action: (data: any) => wrapGenerator(this.insert(data))
            },
            {
                name: 'Remove (first)',
                action: (data: any) => wrapGenerator(this.remove())
            },
            {
                name: 'Search',
                action: (data: any) => wrapGenerator(this.search(data))
            }
        ];
    }
}

export class Composed extends Structure {
    protected head: Structure | null = null;
    constructor(protected type: StructureType, protected subtype: StructureType) {
        super();
    }

    draw() {
        this.setDefaultDrawAttributes();
        this.head?.draw();
        this.head?.applyToElements(elem => {
            if (!(elem instanceof Node && elem.value instanceof Structure)) return ;

            // Set horizontal-vertical arrangement
            elem.value.setDisplay(this.display == Display.VERTICAL ? Display.HORIZONTAL : Display.VERTICAL);

            // Assign different shapes to the parent/child nodes if both structures are a List
            if (this.head instanceof List && elem.value instanceof List)
                elem.value.setNodeType(this.head.nodeType == NodeType.CIRCULAR ? NodeType.RECTANGULAR : NodeType.CIRCULAR);

            elem.value.draw();
        });
        return this;
    }

    setPos(x: number, y: number) {
        super.setPos(x, y);
        this.head?.setPos(x, y);
        this.head?.applyToElements(elem => {
            if (!(elem instanceof Node)) return ;

            (elem.value as Structure).setPos(
                elem.x + (this.display == Display.VERTICAL ? this.size * 1.5 : 0),
                elem.y + (this.display == Display.HORIZONTAL ? this.size * 1.5 : 0)
            );
        });
        return this;
    }

    setColor(color: string) {
        super.setColor(color);
        this.applyToElements(e => e.setColor(color));
        return this;
    }

    setSize(size: number) {
        super.setSize(size);
        this.applyToElements(e => e.setSize(size));
        return this;
    }

    * insert(key: any, value: any) {
        if (this.head === null) {
            this.head = Composed.getNewStructure(this.subtype)!;
            const l = Composed.getNewStructure(this.subtype)!;
            yield * this.head.insert(key, l);
            return yield * l.insert(value, null);
        }

        // If the parent type is a List, the search needs to be yielded
        // @todo: This probably will apply to Vectors too
        let aux = this.head instanceof List && !(Object.getPrototypeOf(this.head) instanceof List) ?
            (yield * this.head.search(key)) :
            exhaustGenerator(this.head.search(key));

        if (aux == null) {
            const l = Composed.getNewStructure(this.subtype)!;
            const inserted = exhaustGenerator<Node, Node>(this.head.insert(key, l));
    
            // If a nested node is being added the properties need to be set again
            this.setDefaultDrawAttributes();
            l.setDefaultDrawAttributes();
            
            yield inserted;
            return yield * l.insert(value, null);
        }

        return yield * aux.value.insert(value, null);
    }

    getActions(): { name: string; action: (...vals: any[]) => void; }[] {
        return [
            { name: 'Insert', action: (...vals: [any, any]) => wrapGenerator(this.insert(...vals)) },
            { name: 'Remove', action: (...vals: [any, any]) => wrapGenerator(this.remove(...vals)) },
            { name: 'Search', action: (...vals: [any, any]) => wrapGenerator(this.search(...vals)) }
        ];
    }

    * remove(key: any, value: any) {
        let current: Node | null = (yield * this.head!.search(key));

        if (current != null) {
            yield current;
            return yield * current.value.remove(value);
        }

        return null;
    }

    * search(key: any, value: any): Generator<Node, Node | null> {
        let current: Node | null = (yield * this.head!.search(key));
        if (current != null) {
            yield current;
            return yield * current.value.search(value);
        }

        return null;
    }

    applyToElements(fn: (elem: DrawableElement) => void) {
        if (this.head) {
            this.head.applyToElements(fn);
            this.head.applyToElements((elem: Node | DrawableElement) => {
                if (elem instanceof Node && elem.value != undefined && elem.value["applyToElements"]) {
                    elem.value.applyToElements(fn);
                }
            });
        }
    }

    static default(t1: StructureType = StructureType.LIST, t2: StructureType = StructureType.LIST): Composed {
        const composed = new Composed(t1, t2);
        exhaustGenerator(composed.insert(0, 0));
        exhaustGenerator(composed.insert(1, 0));
        exhaustGenerator(composed.insert(1, 1));
        exhaustGenerator(composed.insert(2, 0));
        exhaustGenerator(composed.insert(2, 1));
        exhaustGenerator(composed.insert(2, 2));
        return composed;
    }

    static getNewStructure(type: StructureType): Structure | undefined {
        switch (type) {
            case StructureType.LIST:
                return new List().setDefaultDrawAttributes();
            case StructureType.QUEUE:
                return new Queue().setDefaultDrawAttributes();
            case StructureType.STACK:
                return new Stack().setDefaultDrawAttributes();
            default:
                return undefined;
        }
    }
}

export function createStructure(type: StructureType, subtype?: StructureType): Structure | undefined {
    if (subtype != undefined && subtype != StructureType.EMPTY) {
        return new Composed(type, subtype).setDefaultDrawAttributes();
    }
    
    switch (type) {
        case StructureType.LIST:
            return new List().setDefaultDrawAttributes();
        case StructureType.QUEUE:
            return new Queue().setDefaultDrawAttributes();
        case StructureType.STACK:
            return new Stack().setDefaultDrawAttributes();
        default:
            return undefined;
    }
}

export function createDefaultStructure(type: StructureType, subtype?: StructureType): Structure | undefined {
    if ( type == StructureType.VECTOR || subtype == StructureType.VECTOR ) {
        return undefined ; // @todo : Not implemented yet
    }

    if ( subtype != undefined && subtype != StructureType.EMPTY) {
        return Composed.default(type, subtype).setDefaultDrawAttributes();
    }

    switch (type) {
        case StructureType.LIST:
            return List.ofLength(3).setDefaultDrawAttributes();
        case StructureType.QUEUE:
            return Queue.ofLength(3).setDefaultDrawAttributes();
        case StructureType.STACK:
            return Stack.ofLength(3).setDefaultDrawAttributes();
        default:
            return undefined;
    }
}

function wrapGenerator(generator: Generator<Node, Node | null, any>) {
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    Promise.resolve().then(async () => {
        let res: IteratorResult<Node, Node | null> ;
        let prevNode = undefined;
        while (res = generator.next()) {
            console.log(res.value);
            prevNode && prevNode.setHightlight(false);
            prevNode = res.value;
            prevNode && prevNode.setHightlight(true);
            if (res.done) {
                // Needs to trigger a full re-render so position-color-size information flows down from the parent structures
                // There's probably a better way to achieve this...
                // (Only required on insert)
                Context.Render();
                await wait(intervalMS);
                break ;
            }
            await wait(intervalMS);
        }
        res?.value?.setHightlight(false);
        // Needs to trigger a full re-render so removed nodes are not drawn
        // (Only required on remove)
        Context.Render();
    });
}

function exhaustGenerator<T, R>(generator: Generator<T, R>) {
    let res: IteratorResult<T, R> ;
    while (res = generator.next()) {
        if (res.done) {
            break ;
        }
    }
    return res.value;
}

// https://stackoverflow.com/a/6333775
function canvasArrow(context: CanvasRenderingContext2D, fromx: number, fromy: number, tox: number, toy: number) {
    context.beginPath();
    var headlen = 10; // length of head in pixels
    var dx = tox - fromx;
    var dy = toy - fromy;
    var angle = Math.atan2(dy, dx);
    context.moveTo(fromx, fromy);
    context.lineTo(tox, toy);
    context.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
    context.moveTo(tox, toy);
    context.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
    context.stroke();
}