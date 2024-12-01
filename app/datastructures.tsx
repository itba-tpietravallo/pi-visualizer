export class Canvas {
    private elements: DrawableElement[] = [];
    private zoom: number = 1;
    private offsetX = 0;
    private offsetY = 0;
    private ctx: CanvasRenderingContext2D | null = null;
    private intervalMS = 0;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    addElement(element: DrawableElement) {
        this.elements.push(element);
    }

    dropAllElements() {
        this.elements = [];
        this.clear();
    }

    replaceElements(...elements: DrawableElement[]) {
        this.elements = elements;
        this.render();
    }

    draw() {
        this.elements.forEach((element) => element.draw(this));
    }

    clear() {
        this.ctx?.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }

    render() {
        this.clear();
        this.draw();
    }

    setZoom(deltaZoom: number) {
        if (this.zoom + deltaZoom < 0.1) return ;
        this.zoom += deltaZoom;
    }

    setOffset(offsetX: number, offsetY: number) {
        this.offsetX = offsetX;
        this.offsetY = offsetY;
    }

    setIntervalMs(intervalMS: number) {
        this.intervalMS = intervalMS;
    }

    getZoom() {
        return this.zoom;
    }

    getContext() {
        return this.ctx;
    }

    getOffset() {
        return [ this.offsetX, this.offsetY ];
    }

    wrapGenerator(generator: Generator<Node, Node | null, any>) {
        const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        
        Promise.resolve().then(async () => {
            let res: IteratorResult<Node, Node | null> ;
            let prevNode = undefined;
            while (res = generator.next()) {
                if (prevNode) prevNode.setHightlight(this, false);
                prevNode = res.value;
                if (prevNode) prevNode.setHightlight(this, true);
                if (res.done) {
                    // Needs to trigger a full re-render so position-color-size information flows down from the parent structures
                    // There's probably a better way to achieve this...
                    // (Only required on insert)
                    this.render();
    
                    await wait(this.intervalMS);
                    break ;
                }
                await wait(this.intervalMS);
            }
            res?.value?.setHightlight(this, false);
            // Needs to trigger a full re-render so removed nodes are not drawn
            // (Only required on remove)
            this.render();
        });
    }
}

export abstract class DrawableElement {
    public x: number = 0;
    public y: number = 0;
    public size: number = 0;
    protected color: string = '';
    protected highlight: boolean = false;

    abstract draw(canvas: Canvas): DrawableElement;

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

    setHightlight(canvas: Canvas, bool: boolean) {
        this.highlight = bool;
        this.draw(canvas);
        return this;
    }

    static drawArrow(Canvas: Canvas, fromx: number, fromy: number, tox: number, toy: number, fromSize: number, toSize: number) {
        if (Canvas && Canvas.getContext()) {
            const zoom = Canvas.getZoom();
            const ctx = Canvas.getContext()!;
            const [ offsetX, offsetY ] = Canvas.getOffset();

            fromx *= zoom;
            fromy *= zoom;
            tox *= zoom;
            toy *= zoom;
            fromSize *= zoom;
            toSize *= zoom;

            ctx.strokeStyle = 'rgb(0, 0, 0)';
            const diffX = tox - fromx;
            const diffY = toy - fromy;
            
            if (Math.abs(diffX) < 0.001) {
                if (diffY > 0) {
                    this.canvasArrow(ctx, fromx + fromSize / 2 + offsetX, fromy + fromSize + offsetY, tox + toSize / 2 + offsetX, toy + offsetY);
                } else {
                    this.canvasArrow(ctx, fromx + fromSize / 2 + offsetX, fromy + offsetY, tox + toSize / 2 + offsetX, toy + toSize + offsetY);
                }
            } else {
                if (diffX > 0) {
                    this.canvasArrow(ctx, fromx + fromSize + offsetX, fromy + fromSize / 2 + offsetY, tox + offsetX, toy + toSize / 2 + offsetY);
                } else {
                    this.canvasArrow(ctx, fromx + offsetX, fromy + fromSize / 2 + offsetY, tox + toSize + offsetX, toy + toSize / 2 + offsetY);
                }
            }
        }
    }

    // https://stackoverflow.com/a/6333775
    protected static canvasArrow(context: CanvasRenderingContext2D, fromx: number, fromy: number, tox: number, toy: number) {
        context.beginPath();
        const headlen = 10; // length of head in pixels
        const dx = tox - fromx;
        const dy = toy - fromy;
        const angle = Math.atan2(dy, dx);
        context.moveTo(fromx, fromy);
        context.lineTo(tox, toy);
        context.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
        context.moveTo(tox, toy);
        context.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
        context.stroke();
    }
}

export abstract class Structure extends DrawableElement {
    protected abstract type: StructureType;
    protected display: Display = Display.HORIZONTAL;
    protected performActionInPlace: boolean = false;

    abstract insert(...vals: any[]): Generator<Node, Node>;
    /**
     * Note: This method shall YIELD the node that is being removed, instead of returning it, and returns null.
     * This is to allow wrapGenerator to highlight the node being removed.
     */
    abstract remove(...vals: any[]): Generator<Node, Node | null>;
    abstract search(...vals: any[]): Generator<Node, Node | null>;
    abstract getActions(canvas: Canvas): { name: string, action: (...vals: any[]) => void }[];
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

    draw(Canvas: Canvas) {
        if (!Canvas || !Canvas.getContext()) return this;
        const zoom = Canvas.getZoom();
        const ctx = Canvas.getContext()!;
        const [ offsetX, offsetY ] = Canvas.getOffset();

        const x = this.x * zoom;
        const y = this.y * zoom;
        const size = this.size * zoom;

        ctx.fillStyle = this.color || 'rgb(255, 0, 255)';
        ctx.strokeStyle = this.highlight ? 'rgb(255,0,0)' : ctx.fillStyle;
        ctx.lineWidth = 3;

        if (this.type === NodeType.CIRCULAR) {
            ctx.beginPath();
            ctx.arc(x + size / 2 + offsetX, y + size / 2 + offsetY, size / 2, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        } else if (this.type === NodeType.RECTANGULAR) {
            ctx.fillRect(x + offsetX, y + offsetY, size, size);
            ctx.strokeRect(x + offsetX, y + offsetY, size, size);
        }

        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${Math.ceil(20 * zoom * 10) / 10}px Arial`;
        ctx.fillText(this.toString(), x + size / 2 + offsetX, y + size / 2 + offsetY);
        return this;
    }

    drawPointerToNext(canvas: Canvas) {
        if (this.next) {
            Node.drawArrow(canvas, this.x, this.y, this.next.x, this.next.y, this.size, this.next.size);
        }
    }
}

export class List extends Structure {
    public type: StructureType = StructureType.LIST;
    public nodeType: NodeType = NodeType.CIRCULAR;

    head: Node | null = null;

    constructor(public readonly allowDuplicates: boolean = true) {
        super();
    }

    static ofLength(length: number) {
        const list = new List();
        for (let i = 0; i < length; i++) {
            exhaustGenerator(list.insert(i));
        }
        return list;
    }

    draw(canvas: Canvas) {
        let current = this.head;
        this.setPos(this.x, this.y);
        this.setSize(this.size);
        this.setColor(this.color);
        while (current) {
            current.draw(canvas);
            current.drawPointerToNext(canvas);
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

        if (!this.allowDuplicates && current.next && current.next.key == data) return current.next;

        current.next = new Node(data, value, current.next);
        return current.next;
    }

    * remove(key: any) {
        if (this.head === null) return null;

        if (this.head.key === key) {
            yield this.head;
            this.head = this.head.next;
            return null;
        }

        let current = this.head;
        yield current;
        while (current.next && current.next.key <= key) {
            if (current.next.key == key) {
                yield current.next ;
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

    getActions(canvas: Canvas) {
        return [
            {
                name: 'Insert',
                action: (data: any) => canvas.wrapGenerator(this.insert(data))
            },
            {
                name: 'Remove',
                action: (data: any) => canvas.wrapGenerator(this.remove(data))
            },
            {
                name: 'Search',
                action: (data: any) => canvas.wrapGenerator(this.search(data))
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

    setHightlight(canvas: Canvas, bool: boolean) {
        this.applyToElements((elem) => elem.setHightlight(canvas, bool));
        return this;
    }
}

export class Queue extends List {
    public readonly type: StructureType = StructureType.QUEUE;
    last: Node | null = null;

    constructor() {
        super(true);
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

    getActions(canvas: Canvas): { name: string; action: (data: any) => void; }[] {
        return [
            {
                name: 'Insert (last)',
                action: (data: any) => canvas.wrapGenerator(this.insert(data))
            },
            {
                name: 'Remove (first)',
                action: () => canvas.wrapGenerator(this.remove())
            },
            {
                name: 'Search',
                action: (data: any) => canvas.wrapGenerator(this.search(data))
            }
        ];
    }
}

export class Stack extends List {
    public readonly type: StructureType = StructureType.STACK;

    constructor() {
        super(true);
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

    getActions(canvas: Canvas): { name: string; action: (data: any) => void; }[] {
        return [
            {
                name: 'Insert (first)',
                action: (data: any) => canvas.wrapGenerator(this.insert(data))
            },
            {
                name: 'Remove (first)',
                action: () => canvas.wrapGenerator(this.remove())
            },
            {
                name: 'Search',
                action: (data: any) => canvas.wrapGenerator(this.search(data))
            }
        ];
    }
}

export class Composed extends Structure {
    protected head: Structure | null = null;
    constructor(protected type: StructureType, protected subtype: StructureType) {
        super();
    }

    draw(canvas: Canvas) {
        this.setDefaultDrawAttributes();
        this.head?.draw(canvas);
        this.head?.applyToElements(elem => {
            if (!(elem instanceof Node && elem.value instanceof Structure)) return ;

            // Set horizontal-vertical arrangement
            elem.value.setDisplay(this.display == Display.VERTICAL ? Display.HORIZONTAL : Display.VERTICAL);

            // Assign different shapes to the parent/child nodes if both structures are a List
            if (this.head instanceof List && elem.value instanceof List)
                elem.value.setNodeType(this.head.nodeType == NodeType.CIRCULAR ? NodeType.RECTANGULAR : NodeType.CIRCULAR);

            Composed.drawArrow(canvas, elem.x, elem.y, elem.value.x, elem.value.y, this.size, elem.size);
            elem.value.draw(canvas);
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
            this.head = Composed.getNewStructure(this.type, true)!;
            const l = Composed.getNewStructure(this.subtype, false)!;
            yield * this.head.insert(key, l);
            return yield * l.insert(value, null);
        }

        const l = Composed.getNewStructure(this.subtype, false)!;
        const aux = yield * this.head.insert(key, l);

        // If the nested structure had to be added, set it's attr
        if (l != aux.value) {
            this.setDefaultDrawAttributes();
            l.setDefaultDrawAttributes();
        }
        
        return yield * aux.value.insert(value, null);
    }

    getActions(canvas: Canvas): { name: string; action: (...vals: any[]) => void; }[] {
        return [
            { name: 'Insert', action: (...vals: [any, any]) => canvas.wrapGenerator(this.insert(...vals)) },
            { name: 'Remove', action: (...vals: [any, any]) => canvas.wrapGenerator(this.remove(...vals)) },
            { name: 'Search', action: (...vals: [any, any]) => canvas.wrapGenerator(this.search(...vals)) }
        ];
    }

    * remove(key: any, value: any) {
        const current: Node | null = (yield * this.head!.search(key));

        if (current != null) {
            yield current;
            return yield * current.value.remove(value);
        }

        return null;
    }

    * search(key: any, value: any): Generator<Node, Node | null> {
        const current: Node | null = (yield * this.head!.search(key));
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

    static getNewStructure(type: StructureType, isHead: boolean = false): Structure | undefined {
        switch (type) {
            case StructureType.LIST:
                // No not allow duplicates in parent list
                return new List(!isHead).setDefaultDrawAttributes();
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

function exhaustGenerator<T, R>(generator: Generator<T, R>) {
    let res: IteratorResult<T, R> ;
    while (res = generator.next()) {
        if (res.done) {
            break ;
        }
    }
    return res.value;
}
