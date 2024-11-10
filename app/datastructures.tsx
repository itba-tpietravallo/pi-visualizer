const Context: { ctx: CanvasRenderingContext2D | null, offsetX: number, offsetY: number, Render: () => void } = {
    ctx: null,
    offsetX: 0,
    offsetY: 0,
    Render: () => {},
};

export function setContext(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number, render: () => void) {
    Context.ctx = ctx;
    Context.offsetX = offsetX;
    Context.offsetY = offsetY;
    Context.Render = render;
}

export abstract class DrawableElement {
    protected x: number = 0;
    protected y: number = 0;
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

    abstract insert(data: any): Generator<Node, Node | null>;
    /**
     * Note: This method shall YIELD the node that is being removed, instead of returning it. And return null. 
     * This is to allow wrapGenerator to highlight the node being removed.
     */
    abstract remove(data: any): Generator<Node, Node | null>;
    abstract search(data: any): Generator<Node, Node | null>;
    abstract getActions(): { name: string, action: (data: any) => void }[];
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

    constructor(public data: any, public next: Node | null = null) {
        super();
        this.data = data;
        this.next = next;
    }

    toString() {
        return this.data.toString();
    }

    equals(other: Node) {
        return this.data === other.data;
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
        }

        Context.ctx.fillStyle = 'rgb(255, 255, 255)';
        Context.ctx.textAlign = 'center';
        Context.ctx.textBaseline = 'middle';
        Context.ctx.font = '20px Arial';
        Context.ctx.fillText(this.data.toString(), this.x + this.size / 2 + Context.offsetX, this.y + this.size / 2 + Context.offsetY);
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
    public readonly type: StructureType = StructureType.LIST;
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

    * insert(data: any) {
        if (this.head === null) {
            this.head = new Node(data, null);
            return this.head;
        }

        if (data < this.head.data) {
            this.head = new Node(data, this.head);
            return this.head;
        }

        let current = this.head;
        yield current;

        while (current.next && data > current.next.data) {
            current = current.next;
            yield current;
        }

        current.next = new Node(data, current.next);
        return current.next;
    }

    * remove(data: any) {
        if (this.head === null) return null;

        if (this.head.data === data) {
            let aux = this.head;
            yield aux;
            this.head = this.head.next;
            return null;
        }

        let current = this.head;
        yield current;
        while (current.next && current.next.data <= data) {
            if (current.next.data == data) {
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

    * search(data: any) {
        let current = this.head;
        while (current) {
            if (current.data < data) {
                yield current;
            }
            if (current.data == data) {
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

    applyToElements(fn: (elem: DrawableElement) => void) {
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

    * insert (data: any) {
        if (this.head === null || this.last == null) {
            this.head = this.last = new Node(data, null);
            return this.head;
        }

        yield this.last;
        this.last.next = new Node(data, null);
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

    * insert(data: any) {
        if (this.head) yield this.head;
        this.head = new Node(data, this.head);

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

export function createStructure(type: StructureType): Structure | undefined {
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

export function createDefaultStructure(type: StructureType): Structure | undefined {
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
            prevNode && prevNode.setHightlight(false);
            prevNode = res.value;
            prevNode && prevNode.setHightlight(true);
            if (res.done) {
                // Needs to trigger a full re-render so position-color-size information flows down from the parent structures
                // There's probably a better way to achieve this...
                // (Only required on insert)
                Context.Render();
                await wait(250);
                break ;
            }
            await wait(250);
        }
        res?.value?.setHightlight(false);
        // Needs to trigger a full re-render so removed nodes are not drawn
        // (Only required on remove)
        Context.Render();
    });
}

function exhaustGenerator(generator: Generator<Node, Node | null, any>) {
    let res: IteratorResult<Node, Node | null> ;
    while (res = generator.next()) {
        if (res.done) {
            break ;
        }
    }
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